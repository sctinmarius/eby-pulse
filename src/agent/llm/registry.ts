import { createAnthropic } from '@ai-sdk/anthropic';
import { createProviderRegistry } from 'ai';

export function createAnthropicRegistry(apiKey: string) {
  return createProviderRegistry({ anthropic: createAnthropic({ apiKey }) });
}

export type ModelRegistry = ReturnType<typeof createAnthropicRegistry>;
