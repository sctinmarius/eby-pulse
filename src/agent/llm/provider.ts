import { generateText, NoObjectGeneratedError, Output } from 'ai';
import type { z } from 'zod';
import type { ModelRegistry } from './registry.js';

export interface GenerateObjectInput<T> {
  model: string;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
}

export interface GenerateObjectUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface GenerateObjectResult<T> {
  object: T;
  usage: GenerateObjectUsage;
}

export interface LlmProvider {
  readonly kind: 'anthropic' | 'fake';
  generateObject<T>(input: GenerateObjectInput<T>): Promise<GenerateObjectResult<T>>;
}

export class SchemaValidationError extends Error {}

export class AnthropicLlmProvider implements LlmProvider {
  readonly kind = 'anthropic' as const;

  constructor(private readonly registry: ModelRegistry) {}

  async generateObject<T>(input: GenerateObjectInput<T>): Promise<GenerateObjectResult<T>> {
    try {
      const result = await generateText({
        model: this.registry.languageModel(input.model as `anthropic:${string}`),
        system: input.system,
        prompt: input.prompt,
        output: Output.object({ schema: input.schema }),
      });

      return {
        object: result.output,
        usage: {
          inputTokens: result.usage.inputTokens ?? 0,
          outputTokens: result.usage.outputTokens ?? 0,
        },
      };
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        throw new SchemaValidationError(err.message);
      }
      throw err;
    }
  }
}

interface QueuedResponse<T = unknown> {
  object?: T;
  usage?: GenerateObjectUsage;
  error?: Error;
}

export class FakeLlmProvider implements LlmProvider {
  readonly kind = 'fake' as const;

  calls: GenerateObjectInput<unknown>[] = [];
  private readonly queue: QueuedResponse[] = [];

  enqueueObject<T>(object: T, usage: GenerateObjectUsage = { inputTokens: 1, outputTokens: 1 }) {
    this.queue.push({ object, usage });
  }

  enqueueValidationError(message: string) {
    this.queue.push({ error: new SchemaValidationError(message) });
  }

  async generateObject<T>(input: GenerateObjectInput<T>): Promise<GenerateObjectResult<T>> {
    this.calls.push(input as GenerateObjectInput<unknown>);
    const next = this.queue.shift();
    if (!next) {
      throw new Error('FakeLlmProvider: no responses queued');
    }
    if (next.error) {
      throw next.error;
    }
    return { object: next.object as T, usage: next.usage ?? { inputTokens: 1, outputTokens: 1 } };
  }
}

export async function generateObjectWithRepair<T>(
  provider: LlmProvider,
  input: GenerateObjectInput<T>,
): Promise<GenerateObjectResult<T>> {
  try {
    return await provider.generateObject(input);
  } catch (err) {
    if (!(err instanceof SchemaValidationError)) {
      throw err;
    }
    return provider.generateObject({
      ...input,
      prompt: `${input.prompt}\n\nYour previous response was invalid: ${err.message}\nRespond again with corrected JSON that matches the schema exactly.`,
    });
  }
}
