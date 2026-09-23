import { Valyu, type SearchOptions, type SearchResponse } from "valyu-js";
import { withTimeout, type ServiceError } from "../../utils/concurrency.js";

const valyu = new Valyu(process.env.VALYU_API_KEY);
const VALYU_TIMEOUT_MS = 30_000;

export async function searchValyu(
  query: string,
  options?: SearchOptions,
): Promise<SearchResponse> {
  const response = await withTimeout(
    valyu.search(query, options),
    VALYU_TIMEOUT_MS,
    "Valyu search",
  );

  if (!response.success) {
    const error = new Error(
      response.error || "Valyu search failed",
    ) as ServiceError;

    const statusMatch = response.error?.match(/\b(429|500|502|503|504)\b/);

    if (statusMatch) {
      error.status = Number(statusMatch[1]);
    }

    throw error;
  }

  return response;
}
