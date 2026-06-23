import type { FastifyPluginAsync } from 'fastify';
import type { LlmProvider } from '../agent/llm/provider.js';
import { llmProvider, MODEL_BY_TASK } from '../libs/llm.js';

declare module 'fastify' {
  interface FastifyInstance {
    llmProvider: LlmProvider;
  }
}

const llmPlugin: FastifyPluginAsync = async (app) => {
  app.decorate('llmProvider', llmProvider);

  const models = Object.entries(MODEL_BY_TASK)
    .map(([task, model]) => `${task}=${model}`)
    .join(' ');
  // Fastify's logger is disabled in NODE_ENV=test (see src/app.ts), so this is logged
  // via console rather than app.log to stay visible there too.
  console.log(`[llm] provider=${llmProvider.kind} ${models}`);
};

export default llmPlugin;
