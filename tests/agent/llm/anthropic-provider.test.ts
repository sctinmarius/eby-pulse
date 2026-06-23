import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { generateText, NoObjectGeneratedError, Output } from 'ai';
import { AnthropicLlmProvider, SchemaValidationError } from '../../../src/agent/llm/provider.js';
import type { ModelRegistry } from '../../../src/agent/llm/registry.js';

vi.mock('ai', () => {
  class MockNoObjectGeneratedError extends Error {
    constructor(options: { message?: string } = {}) {
      super(options.message ?? 'No object generated');
    }

    static isInstance(err: unknown): err is MockNoObjectGeneratedError {
      return err instanceof MockNoObjectGeneratedError;
    }
  }

  return {
    generateText: vi.fn(),
    Output: { object: vi.fn((spec: unknown) => ({ __outputSpec: spec })) },
    NoObjectGeneratedError: MockNoObjectGeneratedError,
  };
});

const schema = z.object({ value: z.string() });
const FAKE_MODEL = Symbol('language-model');

function fakeRegistry(): ModelRegistry {
  return { languageModel: vi.fn(() => FAKE_MODEL) } as unknown as ModelRegistry;
}

describe('AnthropicLlmProvider', () => {
  it('calls generateText with Output.object(schema) and maps output/usage', async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      output: { value: 'ok' },
      usage: { inputTokens: 12, outputTokens: 34 },
    } as never);

    const registry = fakeRegistry();
    const provider = new AnthropicLlmProvider(registry);

    const result = await provider.generateObject({
      model: 'anthropic:claude-sonnet-4-5',
      schema,
      system: 'system prompt',
      prompt: 'user prompt',
    });

    expect(registry.languageModel).toHaveBeenCalledWith('anthropic:claude-sonnet-4-5');
    expect(Output.object).toHaveBeenCalledWith({ schema });
    expect(generateText).toHaveBeenCalledWith({
      model: FAKE_MODEL,
      system: 'system prompt',
      prompt: 'user prompt',
      output: { __outputSpec: { schema } },
    });
    expect(result).toEqual({
      object: { value: 'ok' },
      usage: { inputTokens: 12, outputTokens: 34 },
    });
  });

  it('defaults missing usage token counts to 0', async () => {
    vi.mocked(generateText).mockResolvedValueOnce({
      output: { value: 'ok' },
      usage: {},
    } as never);

    const provider = new AnthropicLlmProvider(fakeRegistry());
    const result = await provider.generateObject({
      model: 'anthropic:claude-sonnet-4-5',
      schema,
      system: 's',
      prompt: 'p',
    });

    expect(result.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
  });

  it('converts NoObjectGeneratedError into SchemaValidationError', async () => {
    vi.mocked(generateText).mockRejectedValueOnce(
      new NoObjectGeneratedError({ message: 'bad schema' } as never),
    );

    const provider = new AnthropicLlmProvider(fakeRegistry());

    await expect(
      provider.generateObject({
        model: 'anthropic:claude-sonnet-4-5',
        schema,
        system: 's',
        prompt: 'p',
      }),
    ).rejects.toThrow(SchemaValidationError);
  });

  it('rethrows unrelated errors as-is', async () => {
    vi.mocked(generateText).mockRejectedValueOnce(new Error('network blip'));

    const provider = new AnthropicLlmProvider(fakeRegistry());

    await expect(
      provider.generateObject({
        model: 'anthropic:claude-sonnet-4-5',
        schema,
        system: 's',
        prompt: 'p',
      }),
    ).rejects.toThrow('network blip');
  });
});
