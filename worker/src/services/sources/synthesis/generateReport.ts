import OpenAI from "openai";
import type { ResearchEvidence } from "../researchEvidence.js";
import { calculateOpenAICost, roundCost } from "../../../utils/cost.js";
import { runWithConcurrencyLimit, withRetry } from "../../../utils/concurrency.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 380_000,
  maxRetries: 0,
});

export interface ReportGenerationResult {
  report: string;
  openaiCost: number;
}

async function generateQuestionReport(
  originalQuestion: string,
  researchQuestion: string,
  sources: ResearchEvidence["sources"],
): Promise<{ section: string; cost: number }> {
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

  const response = await openai.responses.create({
    model: "gpt-5.6-terra",
    input: `
You are conducting a scientific research study.

Original research question:
${originalQuestion}

Specific research question:
${researchQuestion}

Evidence retrieved for this question:
${evidence}

Write a detailed research section answering the specific research question.


Requirements:
- Base the section only on the supplied evidence.
- Synthesize the evidence rather than summarizing sources individually.
- Cite factual claims using the provided citation numbers such as [1] or [2][4].
- Only use citation numbers that exist in the supplied evidence.
- Never invent citations.
- Place citations as close as practical to the factual claim they support.
- Clearly distinguish established findings, uncertainty, limitations, and interpretation.
- Mention conflicting evidence when present.
- Do not make unsupported claims.
- Return Markdown only.

Structure and formatting:
- Start each section with a 1-2 sentence executive summary paragraph.
- Use ## for major section headings.
- Use ### for sub-sections.
- Use **bold** to highlight important terms, values, findings, and conclusions.
- Use *italics* sparingly for emphasis or technical terminology.
- Use > blockquotes for particularly significant findings or short direct quotes from the supplied evidence.
- Use bullet points for 4+ related but unordered items.
- Use numbered lists for sequential steps, procedures, or ordered findings.
- Use a Markdown table when comparing 3 or more items across 2 or more dimensions.
- Use tables only when they improve comparison; do not turn ordinary prose into tables.
- Use horizontal rules (---) only to separate genuinely distinct major sections.
- Use inline LaTeX \`$...$\` for mathematical expressions when needed.
- Use display LaTeX \`$$...$$\` for important equations or mathematical relationships when needed.
- Do not invent equations, numerical values, figures, URLs, or other information not supported by the supplied evidence.
- Do not use code blocks unless the research question specifically requires code or technical syntax.
- Do not use HTML.
- Do not use emojis.

Citations:
- Citation numbers are provided with each source in the format SOURCE [N].
- Use exactly those citation numbers when making claims supported by the corresponding source.
- Never renumber, invent, or modify citation numbers.
- A claim supported by multiple sources may use citations such as [2][4][7].
- Put citations immediately after the relevant sentence or paragraph rather than collecting all citations at the end of a long section.
- Do not cite a source merely because it is generally relevant; cite it when it supports the specific claim being made.

Evidence quality:
- Prefer direct empirical evidence over general statements when both are available.
- Distinguish correlation from causation.
- Distinguish reported results from author interpretation.
- Report uncertainty, methodological limitations, sample limitations, and conflicting findings when supported by the evidence.
- When sources disagree, explicitly describe the disagreement and cite the relevant sources.
- Do not resolve a disagreement by inventing an explanation unless the supplied evidence supports it.
`,
  });

  const cost = calculateOpenAICost(response.usage);

  return {
    section: response.output_text,
    cost,
  };
}

export async function generateReport(
  originalQuestion: string,
  selectedEvidence: ResearchEvidence[],
): Promise<ReportGenerationResult> {
  const sectionResults = await runWithConcurrencyLimit(
    selectedEvidence,
    2,
    async (item) => {
      console.log(`Generating report section: ${item.researchQuestion}`);

      return await withRetry(
        () =>
          generateQuestionReport(
            originalQuestion,
            item.researchQuestion,
            item.sources,
          ),
        3,
        1000,
      );
    },
  );

  const sections = sectionResults.map((r) => r.section);
  const totalOpenaiCost = sectionResults.reduce((sum, r) => sum + r.cost, 0);

  return {
    report: sections.join("\n\n---\n\n"),
    openaiCost: roundCost(totalOpenaiCost),
  };
}
