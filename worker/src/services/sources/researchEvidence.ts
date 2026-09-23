import type { ResearchSource } from "../sources/types.js";

export type ResearchEvidence = {
  researchQuestion: string;
  sources: ResearchSource[];
};

export function buildResearchEvidence(
  sources: ResearchSource[],
): ResearchEvidence[] {
  const grouped = new Map<string, ResearchSource[]>();

  for (const source of sources) {
    for (const researchQuestion of source.researchQuestions) {
      const existing = grouped.get(researchQuestion);

      if (existing) {
        existing.push(source);
      } else {
        grouped.set(researchQuestion, [source]);
      }
    }
  }

  return Array.from(grouped.entries()).map(([researchQuestion, sources]) => ({
    researchQuestion,
    sources,
  }));
}
