export type ResearchSource = {
  id: string;
  citationNumber: number;
  title: string;
  url: string;
  content: string;

  source: string;
  sourceType: string;

  publicationDate?: string;

  doi?: string;
  pmid?: string;
  pmcid?: string;

  citation?: string;
  citationCount?: number;
  authors?: string[];
  abstract?: string;

  relevanceScore: number;
  price: number;

  researchQuestions: string[];
};
