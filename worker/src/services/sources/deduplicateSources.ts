import type { ResearchSource } from "./types.js";

export function getDeduplicationKey(source: ResearchSource): string {
  if (source.pmid) {
    return `pmid:${source.pmid}`;
  }

  if (source.doi) {
    return `doi:${source.doi.toLowerCase()}`;
  }

  if (source.url) {
    return `url:${source.url}`;
  }

  return `id:${source.id}`;
}

export function deduplicateSources(
  sources: ResearchSource[],
): ResearchSource[] {
  const unique = new Map<string, ResearchSource>();

  for (const source of sources) {
    const key = getDeduplicationKey(source);
    const existing = unique.get(key);

    if (!existing) {
      unique.set(key, { ...source });
      continue;
    }

    existing.researchQuestions = [
      ...new Set([...existing.researchQuestions, ...source.researchQuestions]),
    ];

    if (source.relevanceScore > existing.relevanceScore) {
      existing.relevanceScore = source.relevanceScore;
    }
  }

  return Array.from(unique.values());
}
