import { AnthropicLlmProvider, FakeLlmProvider, type LlmProvider } from '../agent/llm/provider.js';
import { createAnthropicRegistry } from '../agent/llm/registry.js';
import type { AgentTask } from '../generated/prisma/client.js';
import { config } from './config.js';

export const llmProvider: LlmProvider =
  config.NODE_ENV === 'test'
    ? new FakeLlmProvider()
    : new AnthropicLlmProvider(createAnthropicRegistry(config.providerApiKeys.anthropic ?? ''));

// Env var per task must match `TASK_MODEL_DEFAULTS` in ./task-models.js.
export const MODEL_BY_TASK: Record<AgentTask, string> = {
  GENERATE: config.MODEL_GENERATE,
  RECOMMEND: config.MODEL_RECOMMEND,
  REGENERATE: config.MODEL_REGENERATE,
  DISTILL: config.MODEL_DISTILL,
};

export function modelForTask(task: AgentTask, override?: string): string {
  return override ?? MODEL_BY_TASK[task];
}
