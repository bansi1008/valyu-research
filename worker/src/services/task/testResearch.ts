import { db } from "../../dbconfig/db.js";
import {
  updateTaskStage,
  type ReasoningItem,
} from "./helper/updateTaskStage.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function testResearch(taskId: string) {
  const taskRef = db.collection("tasks").doc(taskId);

  const snapshot = await taskRef.get();
  if (!snapshot.exists) {
    return;
  }
  const task = snapshot.data();
  const question = task?.question || "Test Research Question";

  await taskRef.update({
    status: "running",
    progress: 5,
    currentStage: "planning",
    updatedAt: new Date(),
  });

  await sleep(10000);
  console.log(`[TestResearch] Task ${taskId} -> planning`);
  await updateTaskStage(taskRef, "planning");

  await sleep(10000);
  console.log(`[TestResearch] Task ${taskId} -> searching`);
  await updateTaskStage(taskRef, "searching");

  const mockReasoning: ReasoningItem[] = [
    {
      question: `What are the core fundamentals and evidence regarding: ${question}?`,
      purpose: "Establish foundational literature and baseline findings.",
      sources: [
        {
          title: "Comprehensive Systematic Review of Recent Breakthroughs",
          url: "https://nature.com/articles/s41586-024-test-1",
        },
        {
          title: "Global Academic Consortium Meta-Analysis",
          url: "https://cell.com/cell/fulltext/S0092-test-2",
        },
      ],
    },
    {
      question: "What are the latest clinical, experimental, and empirical results?",
      purpose: "Evaluate statistical significance and cross-validation data.",
      sources: [
        {
          title: "International Journal of Emerging Technologies & Science",
          url: "https://science.org/doi/10.1126/science.test-3",
        },
      ],
    },
  ];

  await sleep(10000);
  console.log(`[TestResearch] Task ${taskId} -> evidence_review`);
  await updateTaskStage(taskRef, "evidence_review", { reasoning: mockReasoning });

  await sleep(10000);
  console.log(`[TestResearch] Task ${taskId} -> synthesising`);
  await updateTaskStage(taskRef, "synthesising");

  const mockCitations = [
    {
      number: 1,
      title: "Comprehensive Systematic Review of Recent Breakthroughs",
      url: "https://nature.com/articles/s41586-024-test-1",
    },
    {
      number: 2,
      title: "Global Academic Consortium Meta-Analysis",
      url: "https://cell.com/cell/fulltext/S0092-test-2",
    },
    {
      number: 3,
      title: "International Journal of Emerging Technologies & Science",
      url: "https://science.org/doi/10.1126/science.test-3",
    },
  ];

  const mockReport = `# Deep Research Report: ${question}

## Executive Summary
This simulated research report evaluates the primary evidence, mechanism pathways, and empirical outcomes related to **${question}** [1].

## Key Findings & Literature Analysis
- **Primary Mechanism**: Rigorous cross-institutional trials confirm strong reproducible effects under controlled conditions [2].
- **Empirical Metrics**: Longitudinal evaluations demonstrate statistically significant performance and reliable outcome metrics [3].

\`\`\`math
P(A | B) = \\frac{P(B | A) P(A)}{P(B)}
\`\`\`

## Synthesis & Conclusion
The synthesized findings indicate substantial advancements across multiple experimental domains [1, 2, 3].`;

  const mockCost = {
    valyu: 0.005,
    openai: 0.012,
    jev: 0.001,
    total: 0.018,
  };

  await sleep(2500);
  console.log(`[TestResearch] Task ${taskId} -> completed`);
  await updateTaskStage(taskRef, "completed", {
    report: mockReport,
    citations: mockCitations,
    cost: mockCost,
    reasoning: mockReasoning,
  });
}
