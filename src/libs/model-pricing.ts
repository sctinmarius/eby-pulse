import { TASK_MODEL_DEFAULTS } from './task-models.js';

interface ModelPrice {
  inputPerMTok: number;
  outputPerMTok: number;
}

// USD per million tokens. Sonnet 4.5 has no separately published price at the time of
// writing, so it's priced at parity with Sonnet 4.6 (same tier; point releases haven't
// historically repriced) — confirm via the Models API if exact accuracy ever matters.
const PRICES: Record<string, ModelPrice> = {
  [TASK_MODEL_DEFAULTS.GENERATE.defaultModel]: { inputPerMTok: 3, outputPerMTok: 15 },
  [TASK_MODEL_DEFAULTS.DISTILL.defaultModel]: { inputPerMTok: 1, outputPerMTok: 5 },
};

export function hasPriceFor(model: string): boolean {
  return model in PRICES;
}

export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICES[model];
  if (!price) {
    throw new Error(
      `No price configured for model "${model}" — add an entry to PRICES in model-pricing.ts`,
    );
  }

  return (
    (inputTokens / 1_000_000) * price.inputPerMTok +
    (outputTokens / 1_000_000) * price.outputPerMTok
  );
}
