export interface TaskCost {
  valyu: number;
  openai: number;
  jev: number;
  total: number;
}

export interface PodcastCost {
  script: number;
  tts: number;
  total: number;
}

export const OPENAI_PRICING = {
  inputPerMillion: 2.50, 
  outputPerMillion: 10.00, 
};

export const TTS_PRICING = {
  perThousandChars: 0.015,
};

export const JEV_PRICING = {
  inputPerMillion: 1.50, 
  outputPerMillion: 0.00, 
  fallbackPerEval: 0.002, 
};

export function roundCost(val: number): number {
  return Math.round((val + Number.EPSILON) * 1000000) / 1000000;
}

export function calculateTTSCost(characters: number): number {
  return roundCost((characters / 1_000) * TTS_PRICING.perThousandChars);
}


export function calculateOpenAICost(usage?: {
  input_tokens?: number | undefined;
  output_tokens?: number | undefined;
  prompt_tokens?: number | undefined;
  completion_tokens?: number | undefined;
} | undefined): number {
  if (!usage) return 0;
  const inTokens = usage.input_tokens ?? usage.prompt_tokens ?? 0;
  const outTokens = usage.output_tokens ?? usage.completion_tokens ?? 0;

  const cost =
    (inTokens / 1_000_000) * OPENAI_PRICING.inputPerMillion +
    (outTokens / 1_000_000) * OPENAI_PRICING.outputPerMillion;

  return roundCost(cost);
}


export function calculateJevCost(usage?: {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  totalTokens?: number | undefined;
} | undefined): number {
  if (!usage || (usage.inputTokens === undefined && usage.outputTokens === undefined)) {
    return JEV_PRICING.fallbackPerEval;
  }

  const inTokens = usage.inputTokens ?? 0;
  const outTokens = usage.outputTokens ?? 0;

  const cost =
    (inTokens / 1_000_000) * JEV_PRICING.inputPerMillion +
    (outTokens / 1_000_000) * JEV_PRICING.outputPerMillion;

  return roundCost(cost > 0 ? cost : JEV_PRICING.fallbackPerEval);
}

export function createEmptyTaskCost(): TaskCost {
  return {
    valyu: 0,
    openai: 0,
    jev: 0,
    total: 0,
  };
}


export function aggregateTaskCost(costs: {
  valyu?: number;
  openai?: number;
  jev?: number;
}): TaskCost {
  const valyu = roundCost(costs.valyu ?? 0);
  const openai = roundCost(costs.openai ?? 0);
  const jev = roundCost(costs.jev ?? 0);
  const total = roundCost(valyu + openai + jev);

  return {
    valyu,
    openai,
    jev,
    total,
  };
}
