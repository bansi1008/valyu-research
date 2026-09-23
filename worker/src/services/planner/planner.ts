import OpenAI from "openai";
import { experimental_evaluate as evaluate } from "ai";
import { z } from "zod";
import {
  calculateOpenAICost,
  calculateJevCost,
  roundCost,
} from "../../utils/cost.js";
import { withRetry, withTimeout } from "../../utils/concurrency.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 45_000,
  maxRetries: 0,
});

const PLAN_THRESHOLD = 0.7;
const MAX_PLAN_REVISIONS = 1;
const JEV_TIMEOUT_MS = 70_000;

const PlannerSchema = z.object({
  researchQuestions: z
    .array(
      z.object({
        question: z.string(),
        purpose: z.string(),
      }),
    )
    .min(1)
    .max(7),
});

export type ResearchPlan = z.infer<typeof PlannerSchema>;

export interface PlanGenerationResult {
  plan: ResearchPlan;
  cost: {
    openai: number;
    jev: number;
  };
}

function getSearchFocusPrompt(searchType?: string): string {
  if (!searchType || searchType === "all") return "";
  if (searchType === "proprietary") {
    return "\n- Search Focus: Focus specifically on academic papers, technical studies, financial reports, and peer-reviewed scientific dimensions.";
  }
  if (searchType === "web") {
    return "\n- Search Focus: Focus on broad web resources, comprehensive overviews, documentation, and general ecosystem topics.";
  }
  if (searchType === "news") {
    return "\n- Search Focus: Focus on recent news coverage, real-time events, media reports, and latest developments.";
  }
  return "";
}

async function createDraftPlan(
  researchQuestion: string,
  searchType?: string,
): Promise<{
  plan: ResearchPlan;
  cost: number;
}> {
  const focusPrompt = getSearchFocusPrompt(searchType);

  const response = await withRetry(() =>
    client.responses.parse({
      model: "gpt-5.6-terra",
      input: [
        {
          role: "system",
          content: `
You are a research planning assistant.

Given a user's research question, design the minimum sufficient set of
non-redundant research questions needed to answer it comprehensively.

The goal is NOT to create several differently-worded versions of the same
question. Each research question must investigate a meaningfully different
angle of the overall problem so that later deep-dive synthesis sections
have distinct scopes and do not repeat the same background, definitions,
or findings.

Rules:
- Generate at least 1 and at most 7 research questions.
- 7 is an absolute maximum, not a target.
- Do not generate questions just to reach 7.
- Use fewer questions when they provide sufficient coverage.
- Each question must cover a distinct information dimension.
- Questions must be substantially different in PURPOSE, not merely wording.
- Avoid overlapping questions that would retrieve the same evidence.
- Avoid repeating the same concepts, mechanisms, populations, outcomes,
  historical background, or comparisons across multiple questions.
- The questions should collectively cover the original research question.
- Think about the research from different complementary angles where relevant,
  such as:
    * definitions and scope
    * mechanisms or underlying principles
    * current evidence and empirical findings
    * competing approaches or comparisons
    * limitations, failure modes, and controversies
    * real-world applications or clinical/technical implications
    * historical development or evolution
    * future directions and open problems
  Only use an angle when it is genuinely relevant to the original question.
- Prefer questions that naturally build on one another rather than questions
  that independently re-explain the entire topic.
- A later question should be able to assume that earlier questions already
  established their relevant background.
- Do not ask every question to provide a general overview.
- Do not answer the questions.
- Do not generate search queries.
- Do not recommend sources.
${focusPrompt}
`,
        },
        {
          role: "user",
          content: researchQuestion,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "research_plan",
          strict: true,
          schema: z.toJSONSchema(PlannerSchema),
        },
      },
    }),
  );

  if (!response.output_parsed) {
    throw new Error("Planner returned no structured output");
  }

  const cost = calculateOpenAICost(response.usage);

  return {
    plan: PlannerSchema.parse(response.output_parsed),
    cost,
  };
}

async function reviseResearchPlan(
  researchQuestion: string,
  currentPlan: ResearchPlan,
  issues: string[],
  searchType?: string,
): Promise<{
  plan: ResearchPlan;
  cost: number;
}> {
  const focusPrompt = getSearchFocusPrompt(searchType);
  const currentQuestions = currentPlan.researchQuestions
    .map(
      (item, index) =>
        `${index + 1}. ${item.question}\nPurpose: ${item.purpose}`,
    )
    .join("\n\n");

  const response = await withRetry(() =>
    client.responses.parse({
      model: "gpt-5.6-terra",
      input: [
        {
          role: "system",
          content: `
You are an expert research planning assistant.

You are given an initial draft of research questions that failed quality validation.
Your task is to revise and repair the plan to fix the identified issues.

Specific validation issues to fix:
${issues.map((issue) => `- ${issue}`).join("\n")}

Rules:
- Generate at least 1 and at most 7 research questions.
- Retain high-quality, relevant questions from the draft where appropriate.
- Remove or merge any redundant or overlapping questions.
- Add questions covering missing angles if coverage was insufficient.
- Ensure all questions are strictly relevant to the original research question.
- Do not answer the questions, recommend sources, or write search queries.${focusPrompt}
          `,
        },
        {
          role: "user",
          content: `Original Research Question:
${researchQuestion}

Draft Plan:
${currentQuestions}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "research_plan",
          strict: true,
          schema: z.toJSONSchema(PlannerSchema),
        },
      },
    }),
  );

  if (!response.output_parsed) {
    return { plan: currentPlan, cost: 0 };
  }

  const cost = calculateOpenAICost(response.usage);

  return {
    plan: PlannerSchema.parse(response.output_parsed),
    cost,
  };
}

export async function generateResearchPlan(
  researchQuestion: string,
  searchType?: string,
): Promise<PlanGenerationResult> {
  let openaiCost = 0;
  let jevCost = 0;

  const initial = await createDraftPlan(researchQuestion, searchType);
  let plan = initial.plan;
  openaiCost += initial.cost;

  for (let revision = 0; revision <= MAX_PLAN_REVISIONS; revision++) {
    const questions = plan.researchQuestions
      .map(
        (item, index) =>
          `${index + 1}. ${item.question}\nPurpose: ${item.purpose}`,
      )
      .join("\n\n");

    let review;
    try {
      review = await withRetry(
        () =>
          withTimeout(
            evaluate({
              model: "typesafe-ai/jev",
              state: `
Original research question:
${researchQuestion}

Generated research plan:
${questions}
`,
              questions: {
                planRelevant: {
                  type: "boolean",
                  instructions:
                    "Is this research plan relevant to and capable of addressing the original research question?",
                },
                nonRedundant: {
                  type: "boolean",
                  instructions:
                    "Are the research questions sufficiently distinct and non-redundant?",
                },
                sufficient: {
                  type: "boolean",
                  instructions:
                    "Does the plan cover the important dimensions needed to answer the original research question?",
                },
              },
            }),
            JEV_TIMEOUT_MS,
            "Jev evaluation",
          ),
        2,
        1000,
      );
    } catch (error) {
      console.warn(
        `[Jev] Plan evaluation unavailable. Proceeding with initial plan.`,
        error instanceof Error ? error.message : error,
      );
      return {
        plan,
        cost: {
          openai: roundCost(openaiCost),
          jev: roundCost(jevCost),
        },
      };
    }

    jevCost += calculateJevCost(review.usage);

    const relevantScore = review.answers.planRelevant.probability;
    const nonRedundantScore = review.answers.nonRedundant.probability;
    const sufficientScore = review.answers.sufficient.probability;

    const issues: string[] = [];

    if (relevantScore < PLAN_THRESHOLD) {
      issues.push(
        `Plan relevance is below threshold (${(relevantScore * 100).toFixed(0)}% < ${(PLAN_THRESHOLD * 100).toFixed(0)}%). Ensure every question directly addresses the core objective.`,
      );
    }
    if (nonRedundantScore < PLAN_THRESHOLD) {
      issues.push(
        `Redundancy detected (${(nonRedundantScore * 100).toFixed(0)}% < ${(PLAN_THRESHOLD * 100).toFixed(0)}%). Merge or remove overlapping questions to ensure each covers a distinct dimension.`,
      );
    }
    if (sufficientScore < PLAN_THRESHOLD) {
      issues.push(
        `Plan sufficiency is low (${(sufficientScore * 100).toFixed(0)}% < ${(PLAN_THRESHOLD * 100).toFixed(0)}%). Add key missing dimensions to answer the question comprehensively.`,
      );
    }

    if (issues.length === 0) {
      return {
        plan,
        cost: {
          openai: roundCost(openaiCost),
          jev: roundCost(jevCost),
        },
      };
    }

    if (revision < MAX_PLAN_REVISIONS) {
      console.warn(
        `Research plan failed validation (attempt ${revision + 1}/${MAX_PLAN_REVISIONS + 1}). Revising plan with feedback...`,
        issues,
      );
      const revised = await reviseResearchPlan(
        researchQuestion,
        plan,
        issues,
        searchType,
      );
      plan = revised.plan;
      openaiCost += revised.cost;
    } else {
      console.warn(
        "Max plan revisions reached. Proceeding with best available plan.",
        issues,
      );
      return {
        plan,
        cost: {
          openai: roundCost(openaiCost),
          jev: roundCost(jevCost),
        },
      };
    }
  }

  return {
    plan,
    cost: {
      openai: roundCost(openaiCost),
      jev: roundCost(jevCost),
    },
  };
}
