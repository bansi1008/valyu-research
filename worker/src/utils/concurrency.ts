export type ServiceError = Error & {
  status?: number;
  code?: string;
};

function getStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const value = error as {
    status?: number;
    response?: { status?: number };
    cause?: { status?: number };
  };

  return value.status ?? value.response?.status ?? value.cause?.status;
}

function isRetryableError(error: unknown): boolean {
  const status = getStatus(error);

  if (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    return (
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("socket") ||
      message.includes("fetch failed") ||
      message.includes("aborterror") ||
      error.name === "AbortError" ||
      error.name === "TimeoutError" ||
      error.name === "APIConnectionTimeoutError"
    );
  }

  return false;
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName = "Operation",
): Promise<T> {
  let timer: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`${operationName} timed out after ${timeoutMs}ms`) as ServiceError;
      err.name = "TimeoutError";
      err.status = 408;
      reject(err);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

export async function runWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  if (limit < 1) {
    throw new Error("Concurrency limit must be at least 1");
  }

  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;

      if (index >= items.length) {
        return;
      }

      results[index] = await fn(items[index]!);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    worker(),
  );

  await Promise.all(workers);

  return results;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt === maxAttempts) {
        throw error;
      }

      const delay = baseDelayMs * 2 ** (attempt - 1);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
