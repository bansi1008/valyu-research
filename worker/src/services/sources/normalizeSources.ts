import type { ResearchSource } from "./types.js";

export function normalizeSources(research: any[]): ResearchSource[] {
  const sources: ResearchSource[] = [];

  for (const researchItem of research) {
    for (const result of researchItem.result.results ?? []) {
      sources.push({
        id: result.id ?? result.url,
        citationNumber: 0,
        title: result.title,
        url: result.url,
        content: result.content || result.abstract || "",

        source: result.source,
        sourceType: result.source_type,

        publicationDate: result.publication_date,

        doi: result.doi,
        pmid: result.pmid,
        pmcid: result.pmcid,

        citation: result.citation,
        citationCount: result.citation_count,
        authors: result.authors,
        abstract: result.abstract,

        relevanceScore: result.relevance_score ?? 0,
        price: result.price ?? 0,

        researchQuestions: [researchItem.researchQuestion],
      });
    }
  }

  return sources;
}
