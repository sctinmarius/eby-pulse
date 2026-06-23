import { describe, expect, it } from 'vitest';
import { costUsd, hasPriceFor } from '../../src/libs/model-pricing.js';
import { TASK_MODEL_DEFAULTS } from '../../src/libs/task-models.js';

describe('model-pricing', () => {
  it('has a price for every task default model', () => {
    for (const { defaultModel } of Object.values(TASK_MODEL_DEFAULTS)) {
      expect(hasPriceFor(defaultModel)).toBe(true);
    }
  });

  it('computes cost from input/output tokens for a known model', () => {
    const model = TASK_MODEL_DEFAULTS.GENERATE.defaultModel;
    const cost = costUsd(model, 1_000_000, 1_000_000);
    expect(cost).toBeGreaterThan(0);
  });

  it('throws instead of silently returning $0 for an unknown model', () => {
    expect(() => costUsd('anthropic:made-up-model', 100, 100)).toThrow(/no price configured/i);
  });
});
