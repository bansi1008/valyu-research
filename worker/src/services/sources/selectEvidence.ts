import type { ResearchSource } from "../sources/types.js";
import type { ResearchEvidence } from "./researchEvidence.js";
import { getDeduplicationKey } from "./deduplicateSources.js";

export function selectEvidence(
  evidence: ResearchEvidence[],
  maxSourcesPerQuestion = 5,
): ResearchEvidence[] {

  const selected: ResearchEvidence[] = evidence.map((item) => ({
    researchQuestion: item.researchQuestion,
    sources: [...item.sources]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxSourcesPerQuestion),
  }));

  const citationMap = new Map<string, number>();
  let nextCitationNumber = 1;

  for (const item of selected) {
    for (const source of item.sources) {
      const key = getDeduplicationKey(source);
      if (!citationMap.has(key)) {
        citationMap.set(key, nextCitationNumber++);
      }
      source.citationNumber = citationMap.get(key)!;
    }
  }

  return selected;
}
