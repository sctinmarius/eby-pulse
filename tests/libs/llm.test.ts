import { describe, expect, it } from 'vitest';
import { config } from '../../src/libs/config.js';
import { modelForTask } from '../../src/libs/llm.js';

describe('modelForTask', () => {
  it('returns the configured model for the task when no override is given', () => {
    expect(modelForTask('GENERATE')).toBe(config.MODEL_GENERATE);
    expect(modelForTask('RECOMMEND')).toBe(config.MODEL_RECOMMEND);
    expect(modelForTask('REGENERATE')).toBe(config.MODEL_REGENERATE);
    expect(modelForTask('DISTILL')).toBe(config.MODEL_DISTILL);
  });

  it('prefers an explicit override over the task default', () => {
    expect(modelForTask('GENERATE', 'anthropic:claude-haiku-4-5')).toBe(
      'anthropic:claude-haiku-4-5',
    );
  });
});
