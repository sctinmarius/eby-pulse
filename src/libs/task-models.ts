import type { AgentTask } from '../generated/prisma/client.js';

export type ModelEnvVar =
  | 'MODEL_GENERATE'
  | 'MODEL_RECOMMEND'
  | 'MODEL_REGENERATE'
  | 'MODEL_DISTILL';

export interface TaskModelDefault {
  envVar: ModelEnvVar;
  defaultModel: string;
}

/**
 * Single source of truth for "task X reads env var Y, defaults to model Z".
 * `src/libs/config.ts` sources its MODEL_* defaults from here; `src/libs/model-pricing.ts`
 * sources its known-model price keys from here. Keep `MODEL_BY_TASK` in `src/libs/llm.ts`
 * (env var per task) and this table's `envVar` fields in sync.
 */
export const TASK_MODEL_DEFAULTS: Record<AgentTask, TaskModelDefault> = {
  GENERATE: { envVar: 'MODEL_GENERATE', defaultModel: 'anthropic:claude-sonnet-4-6' },
  RECOMMEND: { envVar: 'MODEL_RECOMMEND', defaultModel: 'anthropic:claude-sonnet-4-6' },
  REGENERATE: { envVar: 'MODEL_REGENERATE', defaultModel: 'anthropic:claude-sonnet-4-6' },
  DISTILL: { envVar: 'MODEL_DISTILL', defaultModel: 'anthropic:claude-haiku-4-5' },
};

export const MODEL_ENV_VARS: ModelEnvVar[] = Object.values(TASK_MODEL_DEFAULTS).map(
  (task) => task.envVar,
);
