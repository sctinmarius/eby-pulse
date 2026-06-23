import { z } from 'zod';
import { modelIdSchema } from '../schema/shared.js';
import { providerApiKeyEnvName, providerIdFromModelId } from './config/providers.js';
import { hasPriceFor } from './model-pricing.js';
import { MODEL_ENV_VARS, TASK_MODEL_DEFAULTS, type ModelEnvVar } from './task-models.js';

const portSchema = z.coerce.number().int().positive();
const apiKeySchema = z.string().min(1).optional();

function configuredProviderIds(env: Record<ModelEnvVar, string>) {
  return new Set(MODEL_ENV_VARS.map((envVar) => providerIdFromModelId(env[envVar])));
}

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: portSchema.optional(),
    API_PORT: portSchema.optional(),
    DATABASE_URL: z.string().min(1),
    BOOTSTRAP_TOKEN: z.string().min(16),
    ANTHROPIC_API_KEY: apiKeySchema,
    OPENAI_API_KEY: apiKeySchema,
    GOOGLE_API_KEY: apiKeySchema,
    TELEGRAM_BOT_TOKEN: z.string().optional(),
    MODEL_GENERATE: modelIdSchema.default(TASK_MODEL_DEFAULTS.GENERATE.defaultModel),
    MODEL_RECOMMEND: modelIdSchema.default(TASK_MODEL_DEFAULTS.RECOMMEND.defaultModel),
    MODEL_REGENERATE: modelIdSchema.default(TASK_MODEL_DEFAULTS.REGENERATE.defaultModel),
    MODEL_DISTILL: modelIdSchema.default(TASK_MODEL_DEFAULTS.DISTILL.defaultModel),
  })
  .transform((env) => ({
    ...env,
    PORT: env.PORT ?? env.API_PORT ?? 3030,
    providerApiKeys: Object.fromEntries(
      [...configuredProviderIds(env)].flatMap((providerId) => {
        const envName = providerApiKeyEnvName(providerId);
        const apiKey = process.env[envName];

        return apiKey ? [[providerId, apiKey]] : [];
      }),
    ),
  }))
  .superRefine((env, ctx) => {
    for (const envVar of MODEL_ENV_VARS) {
      if (!hasPriceFor(env[envVar])) {
        ctx.addIssue({
          code: 'custom',
          path: [envVar],
          message: `model "${env[envVar]}" has no price entry in src/libs/model-pricing.ts`,
        });
      }
    }

    if (env.NODE_ENV === 'test') {
      return;
    }

    for (const providerId of configuredProviderIds(env)) {
      const envName = providerApiKeyEnvName(providerId);

      if (!process.env[envName]) {
        ctx.addIssue({
          code: 'custom',
          path: [envName],
          message: `required because one or more MODEL_* values use provider "${providerId}"`,
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
