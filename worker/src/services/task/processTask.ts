import { db } from "../../dbconfig/db.js";
import { generateResearchPlan } from "../planner/planner.js";
import { retrieveResearch } from "../retrieval/retrieveResearch.js";
import { deduplicateSources } from "../sources/deduplicateSources.js";
import { normalizeSources } from "../sources/normalizeSources.js";
import { buildResearchEvidence as researchEvidence } from "../sources/researchEvidence.js";
import { selectEvidence } from "../sources/selectEvidence.js";
import { generateReport } from "../sources/synthesis/generateReport.js";
import { aggregateTaskCost, type TaskCost } from "../../utils/cost.js";
import { updateTaskStage, type ReasoningItem } from "./helper/updateTaskStage.js";

export async function processTask(taskId: string) {
  const taskRef = db.collection("tasks").doc(taskId);

  const result = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(taskRef);

    if (!snapshot.exists) {
      return null;
    }

    const task = snapshot.data();

    if (task?.status !== "queued") {
      return null;
    }

    tx.update(taskRef, {
      status: "running",
      progress: 5,
      currentStage: "planning",
      updatedAt: new Date(),
    });

    return {
      question: task.question,
      searchType: task.searchType || "all",
    };
  });

  if (!result) {
    return;
  }

  try {
    console.log("Generating research plan for question:", result.question, "focus:", result.searchType);
    await updateTaskStage(taskRef, "planning");

    const planResult = await generateResearchPlan(result.question, result.searchType);
    const plan = planResult.plan;
    const plannerOpenaiCost = planResult.cost.openai;
    const plannerJevCost = planResult.cost.jev;

    console.log("Research plan generated from openai");

    await updateTaskStage(taskRef, "searching");

    const research = await retrieveResearch(plan.researchQuestions, result.searchType);
    const valyuCost = research.valyuCost;

    console.log("Research retrieved for questions from valyu");

    const reasoning: ReasoningItem[] = research.results.map((item) => ({
      question: item.researchQuestion,
      purpose: item.purpose,
      sources: (item.result?.results ?? []).map((r) => ({
        title: r.title || "Untitled Source",
        url: r.url,
      })),
    }));

    await updateTaskStage(taskRef, "evidence_review", { reasoning });

    const normalizedSources = normalizeSources(research.results);
    console.log("Sources normalized from research results. Total:", normalizedSources.length);

    const uniqueSources = deduplicateSources(normalizedSources);
    console.log("Total unique sources:", uniqueSources.length);

    const evidence = researchEvidence(uniqueSources);
    const selectedEvidence = selectEvidence(evidence);

    await updateTaskStage(taskRef, "synthesising");

    const reportResult = await generateReport(result.question, selectedEvidence);
    const report = reportResult.report;
    const synthesisOpenaiCost = reportResult.openaiCost;

    await updateTaskStage(taskRef, "validating");

    const citationSources = selectedEvidence.flatMap((item) => item.sources);

    const uniqueCitationSources = Array.from(
      new Map(citationSources.map((source) => [source.citationNumber, source])).values(),
    ).sort((a, b) => a.citationNumber - b.citationNumber);

    const citations = uniqueCitationSources.map((source) => ({
      number: source.citationNumber,
      title: source.title,
      url: source.url,
    }));

    const cost: TaskCost = aggregateTaskCost({
      valyu: valyuCost,
      openai: plannerOpenaiCost + synthesisOpenaiCost,
      jev: plannerJevCost,
    });

    console.log(`Task ${taskId} completed with cost summary:`, cost);

    await updateTaskStage(taskRef, "completed", {
      report,
      citations,
      cost,
      reasoning,
    });
  } catch (error) {
    console.error(`Task ${taskId} failed:`, error);
    const errorMessage =
      error instanceof Error ? error.message : "An unexpected error occurred during research synthesis.";

    await updateTaskStage(taskRef, "failed", {
      error: errorMessage,
    });
    throw error;
  }
}
