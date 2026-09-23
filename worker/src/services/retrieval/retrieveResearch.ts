import { runWithConcurrencyLimit, withRetry } from "../../utils/concurrency.js";
import { searchValyu } from "./valyu.js";
import { roundCost } from "../../utils/cost.js";
import type { SearchResponse } from "valyu-js";

type ResearchQuestion = {
  question: string;
  purpose: string;
};

export interface ResearchRetrievalItem {
  researchQuestion: string;
  purpose: string;
  result: SearchResponse;
}

export interface ResearchRetrievalResult {
  results: ResearchRetrievalItem[];
  valyuCost: number;
}

export async function retrieveResearch(
  researchQuestions: ResearchQuestion[],
  searchType?: string,
): Promise<ResearchRetrievalResult> {
  const effectiveSearchType = (searchType as "all" | "web" | "proprietary" | "news") || "all";

  const results = await runWithConcurrencyLimit(
    researchQuestions,
    3,
    async (researchQuestion) => {
      const result = await withRetry(
        () =>
          searchValyu(researchQuestion.question, {
            searchType: effectiveSearchType,
            maxNumResults: 20,
            includeAbstracts: true,
          }),
        3,
        1000,
      );

      return {
        researchQuestion: researchQuestion.question,
        purpose: researchQuestion.purpose,
        result,
      };
    },
  );

  const valyuCost = results.reduce(
    (sum, item) => sum + (item.result?.total_deduction_dollars ?? 0),
    0,
  );

  return {
    results,
    valyuCost: roundCost(valyuCost),
  };
}
