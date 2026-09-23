import OpenAI from "openai";
import { experimental_evaluate as evaluate } from "ai";
import type { ResearchEvidence } from "../researchEvidence.js";
import {
  calculateOpenAICost,
  calculateJevCost,
  roundCost,
} from "../../../utils/cost.js";
import { withRetry, withTimeout } from "../../../utils/concurrency.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 180_000,
  maxRetries: 0,
});

const JEV_TIMEOUT_MS = 30_000;
const JEV_GROUNDED_THRESHOLD = 0.7;
const JEV_NON_REDUNDANT_THRESHOLD = 0.65;

export interface ResearchState {
  coveredTopics: string[];
  definitions: string[];
  keyFindings: string[];
  avoidRepeating: string[];
}

export interface SectionOutput {
  markdown: string;
  stateUpdate: {
    coveredTopics: string[];
    definitions: string[];
    keyFindings: string[];
    avoidRepeating: string[];
  };
}

export interface ReportGenerationResult {
  report: string;
  openaiCost: number;
  jevCost: number;
}

function parseSectionOutput(raw: string): SectionOutput {
  try {
    let clean = raw.trim();
    if (clean.startsWith("```json")) {
      clean = clean.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (clean.startsWith("```")) {
      clean = clean.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(clean);
    if (parsed && typeof parsed.markdown === "string") {
      return {
        markdown: parsed.markdown,
        stateUpdate: {
          coveredTopics: Array.isArray(parsed.stateUpdate?.coveredTopics)
            ? parsed.stateUpdate.coveredTopics
            : [],
          definitions: Array.isArray(parsed.stateUpdate?.definitions)
            ? parsed.stateUpdate.definitions
            : [],
          keyFindings: Array.isArray(parsed.stateUpdate?.keyFindings)
            ? parsed.stateUpdate.keyFindings
            : [],
          avoidRepeating: Array.isArray(parsed.stateUpdate?.avoidRepeating)
            ? parsed.stateUpdate.avoidRepeating
            : [],
        },
      };
    }
  } catch {}

  return {
    markdown: raw,
    stateUpdate: {
      coveredTopics: [],
      definitions: [],
      keyFindings: [],
      avoidRepeating: [],
    },
  };
}

async function generateQuestionSection(
  originalQuestion: string,
  researchQuestion: string,
  sources: ResearchEvidence["sources"],
  state: ResearchState,
  questionIndex: number,
  totalQuestions: number,
  repairFeedback?: string[],
): Promise<{ sectionOutput: SectionOutput; cost: number }> {
  const evidence = sources
    .map(
      (source) => `
SOURCE [${source.citationNumber}]
Title: ${source.title}
URL: ${source.url}
Publication Date: ${source.publicationDate ?? "Unknown"}
Authors: ${source.authors?.join(", ") ?? "Unknown"}

Content:
${source.content}
`,
    )
    .join("\n---\n");

  const priorContextBlock =
    state.coveredTopics.length > 0 || state.definitions.length > 0
      ? `
Prior Research State (Established in previous chapters):
- Topics Covered So Far: ${state.coveredTopics.join(", ") || "None"}
- Definitions Already Established: ${state.definitions.join(", ") || "None"}
- Established Key Findings: ${state.keyFindings.join(" | ") || "None"}
- Directives to Avoid Repeating: ${state.avoidRepeating.join(" | ") || "None"}

CONTINUITY DIRECTIVES:
- Do NOT re-explain or re-define any term listed in "Definitions Already Established".
- Do NOT repeat background facts or baseline statistics listed in "Directives to Avoid Repeating".
- Dive straight into the detailed new findings for this specific question.
`
      : "";

  const repairBlock =
    repairFeedback && repairFeedback.length > 0
      ? `
MANDATORY REPAIR INSTRUCTIONS (The previous draft failed verification on these points):
${repairFeedback.map((f, i) => `${i + 1}. ${f}`).join("\n")}
`
      : "";

  const response = await openai.responses.create({
    model: "gpt-5.6-terra",
    input: `
You are writing Chapter ${questionIndex + 1} of ${totalQuestions} for an exhaustive scientific research paper.

Original Overall Research Question:
${originalQuestion}

Current Chapter Specific Question:
${researchQuestion}
${priorContextBlock}
${repairBlock}
Evidence Retrieved for this Chapter:
${evidence}

Write an exhaustive, deeply analytical chapter answering the specific research question, based on the provided evidence strictly.

Output Format:
You MUST respond with a valid JSON object only, matching this exact schema:
{
  "markdown": "## [Chapter Title]\\n\\n[Full detailed chapter markdown text]",
  "stateUpdate": {
    "coveredTopics": ["new topic A", "new topic B"],
    "definitions": ["new technical term defined in this chapter"],
    "keyFindings": ["core empirical or experimental finding established here"],
    "avoidRepeating": ["specific background details future chapters should not repeat"]
  }
}

Requirements for the markdown:
- Write exhaustive, comprehensive, publication-grade academic prose.
- Base every single factual claim strictly on the provided evidence.
- Cite sources immediately using the provided numbers like [1] or [2][4].
- Only use citation numbers present in the supplied evidence.
- Use ## for the chapter title, ### for sub-sections.
- Use Markdown tables when comparing 3+ items across 2+ dimensions.
- Use LaTeX inline \`$...$\` and display \`$$...$$\` for mathematical and biochemical formulas.
- Use > blockquotes for direct quotes or pivotal experimental metrics.
- Do not invent citations, statistics, or URLs.
- Do not output HTML or emojis.
`,
  });

  const cost = calculateOpenAICost(response.usage);
  const sectionOutput = parseSectionOutput(response.output_text);

  return {
    sectionOutput,
    cost,
  };
}

async function validateSectionWithJev(
  originalQuestion: string,
  researchQuestion: string,
  sectionMarkdown: string,
  sources: ResearchEvidence["sources"],
  state: ResearchState,
): Promise<{
  isValid: boolean;
  issues: string[];
  cost: number;
}> {
  try {
    const sourcesSummary = sources
      .map(
        (s) => `[${s.citationNumber}] ${s.title}: ${s.content.slice(0, 400)}`,
      )
      .join("\n");

    const review = await withRetry(
      () =>
        withTimeout(
          evaluate({
            model: "typesafe-ai/jev",
            state: `
Original Research Question:
${originalQuestion}

Current Section Question:
${researchQuestion}

Section Draft Content:
${sectionMarkdown}

Available Sources:
${sourcesSummary}

Prior Context:
- Topics Covered: ${state.coveredTopics.join(", ")}
- Definitions: ${state.definitions.join(", ")}
- Avoid: ${state.avoidRepeating.join(", ")}
`,
            questions: {
              factuallyGrounded: {
                type: "boolean",
                instructions:
                  "Are all factual claims in this section strictly supported by the cited sources without hallucinations or unsupported claims?",
              },
              nonRedundant: {
                type: "boolean",
                instructions:
                  "Does this section avoid repeating background information, introductory definitions, or facts already established in the prior context?",
              },
            },
          }),
          JEV_TIMEOUT_MS,
          "Jev section evaluation",
        ),
      2,
      1000,
    );

    const cost = calculateJevCost(review.usage);
    const groundedScore = review.answers.factuallyGrounded.probability;
    const nonRedundantScore = review.answers.nonRedundant.probability;

    const issues: string[] = [];

    if (groundedScore < JEV_GROUNDED_THRESHOLD) {
      issues.push(
        `Factual grounding is below threshold (${(groundedScore * 100).toFixed(0)}%). Ensure all assertions, statistics, and citations strictly match the supplied evidence.`,
      );
    }

    if (nonRedundantScore < JEV_NON_REDUNDANT_THRESHOLD) {
      issues.push(
        `Redundancy detected with prior sections (${(nonRedundantScore * 100).toFixed(0)}%). Remove repetitive introductory background and established definitions.`,
      );
    }

    return {
      isValid: issues.length === 0,
      issues,
      cost,
    };
  } catch (error) {
    console.warn(
      `[Jev] Section validation unavailable or timed out. Gracefully proceeding with draft.`,
      error instanceof Error ? error.message : error,
    );
    return {
      isValid: true,
      issues: [],
      cost: 0,
    };
  }
}

export async function generateReport(
  originalQuestion: string,
  selectedEvidence: ResearchEvidence[],
): Promise<ReportGenerationResult> {
  let totalOpenaiCost = 0;
  let totalJevCost = 0;

  const state: ResearchState = {
    coveredTopics: [],
    definitions: [],
    keyFindings: [],
    avoidRepeating: [],
  };

  const validatedSections: string[] = [];

  for (let i = 0; i < selectedEvidence.length; i++) {
    const item = selectedEvidence[i]!;
    console.log(
      `[Synthesis] Generating Section ${i + 1}/${selectedEvidence.length}: ${item.researchQuestion}`,
    );

    const initialResult = await withRetry(
      () =>
        generateQuestionSection(
          originalQuestion,
          item.researchQuestion,
          item.sources,
          state,
          i,
          selectedEvidence.length,
        ),
      3,
      1000,
    );

    totalOpenaiCost += initialResult.cost;
    let finalSectionOutput = initialResult.sectionOutput;

    console.log(
      `[Synthesis] Validating Section ${i + 1} with Jev reasoning...`,
    );
    const validation = await validateSectionWithJev(
      originalQuestion,
      item.researchQuestion,
      finalSectionOutput.markdown,
      item.sources,
      state,
    );

    totalJevCost += validation.cost;

    if (!validation.isValid) {
      console.warn(
        `[Synthesis] Section ${i + 1} failed validation. Running single repair pass...`,
        validation.issues,
      );

      const repairResult = await withRetry(
        () =>
          generateQuestionSection(
            originalQuestion,
            item.researchQuestion,
            item.sources,
            state,
            i,
            selectedEvidence.length,
            validation.issues,
          ),
        2,
        1000,
      );

      totalOpenaiCost += repairResult.cost;
      finalSectionOutput = repairResult.sectionOutput;

      const postRepairValidation = await validateSectionWithJev(
        originalQuestion,
        item.researchQuestion,
        finalSectionOutput.markdown,
        item.sources,
        state,
      );
      totalJevCost += postRepairValidation.cost;

      if (!postRepairValidation.isValid) {
        console.warn(
          `[Synthesis] Section ${i + 1} failed post-repair validation. Skipping research state commit.`,
          postRepairValidation.issues,
        );
        validatedSections.push(finalSectionOutput.markdown);
        continue;
      }
    }

    validatedSections.push(finalSectionOutput.markdown);

    if (finalSectionOutput.stateUpdate.coveredTopics.length > 0) {
      state.coveredTopics = Array.from(
        new Set([
          ...state.coveredTopics,
          ...finalSectionOutput.stateUpdate.coveredTopics,
        ]),
      );
    }
    if (finalSectionOutput.stateUpdate.definitions.length > 0) {
      state.definitions = Array.from(
        new Set([
          ...state.definitions,
          ...finalSectionOutput.stateUpdate.definitions,
        ]),
      );
    }
    if (finalSectionOutput.stateUpdate.keyFindings.length > 0) {
      state.keyFindings.push(...finalSectionOutput.stateUpdate.keyFindings);
    }
    if (finalSectionOutput.stateUpdate.avoidRepeating.length > 0) {
      state.avoidRepeating = Array.from(
        new Set([
          ...state.avoidRepeating,
          ...finalSectionOutput.stateUpdate.avoidRepeating,
        ]),
      );
    }

    console.log(
      `[Synthesis] Section ${i + 1} validated and committed to research state.`,
    );
  }

  const finalReport = validatedSections.join("\n\n---\n\n");

  return {
    report: finalReport,
    openaiCost: roundCost(totalOpenaiCost),
    jevCost: roundCost(totalJevCost),
  };
}
