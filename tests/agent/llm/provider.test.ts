import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FakeLlmProvider, generateObjectWithRepair } from '../../../src/agent/llm/provider.js';

const schema = z.object({ value: z.string() });

describe('generateObjectWithRepair', () => {
  it('returns the result on the first successful call', async () => {
    const provider = new FakeLlmProvider();
    provider.enqueueObject({ value: 'ok' });

    const result = await generateObjectWithRepair(provider, {
      model: 'anthropic:claude-sonnet-4-5',
      schema,
      system: 'system',
      prompt: 'prompt',
    });

    expect(result.object).toEqual({ value: 'ok' });
    expect(provider.calls).toHaveLength(1);
  });

  it('retries once with the validation error appended, then succeeds', async () => {
    const provider = new FakeLlmProvider();
    provider.enqueueValidationError('missing field "value"');
    provider.enqueueObject({ value: 'fixed' });

    const result = await generateObjectWithRepair(provider, {
      model: 'anthropic:claude-sonnet-4-5',
      schema,
      system: 'system',
      prompt: 'original prompt',
    });

    expect(result.object).toEqual({ value: 'fixed' });
    expect(provider.calls).toHaveLength(2);
    expect(provider.calls[1]?.prompt).toContain('original prompt');
    expect(provider.calls[1]?.prompt).toContain('missing field "value"');
  });

  it('throws when the repair retry also fails', async () => {
    const provider = new FakeLlmProvider();
    provider.enqueueValidationError('first failure');
    provider.enqueueValidationError('second failure');

    await expect(
      generateObjectWithRepair(provider, {
        model: 'anthropic:claude-sonnet-4-5',
        schema,
        system: 'system',
        prompt: 'prompt',
      }),
    ).rejects.toThrow('second failure');
    expect(provider.calls).toHaveLength(2);
  });

  it('does not retry on a non-validation error', async () => {
    const provider = new FakeLlmProvider();
    // no queued response — generateObject throws "no responses queued"
    await expect(
      generateObjectWithRepair(provider, {
        model: 'anthropic:claude-sonnet-4-5',
        schema,
        system: 'system',
        prompt: 'prompt',
      }),
    ).rejects.toThrow('no responses queued');
    expect(provider.calls).toHaveLength(1);
  });
});
