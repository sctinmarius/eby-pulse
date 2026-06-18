import { z } from 'zod';

const portSchema = z.coerce.number().int().positive();
const apiKeySchema = z.string().min(1).optional();
const modelEnvKeys = [
  'MODEL_GENERATE',
  'MODEL_RECOMMEND',
  'MODEL_REGENERATE',
  'MODEL_DISTILL',
] as const;

const modelId = z
  .string()
  .regex(
    /^[a-z0-9-]+:.+$/i,
    'expected format providerId:modelId (e.g. anthropic:claude-sonnet-4-5)',
  );

const providerApiKeyEnvNames: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  gemini: 'GOOGLE_API_KEY',
};

function providerIdFromModelId(value: string) {
  return value.split(':', 1)[0] ?? '';
}

function providerApiKeyEnvName(providerId: string) {
  return (
    providerApiKeyEnvNames[providerId] ??
    `${providerId.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_API_KEY`
  );
}

function configuredProviderIds(env: Record<(typeof modelEnvKeys)[number], string>) {
  return new Set(modelEnvKeys.map((key) => providerIdFromModelId(env[key])));
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
    MODEL_GENERATE: modelId.default('anthropic:claude-sonnet-4-5'),
    MODEL_RECOMMEND: modelId.default('anthropic:claude-sonnet-4-5'),
    MODEL_REGENERATE: modelId.default('anthropic:claude-sonnet-4-5'),
    MODEL_DISTILL: modelId.default('anthropic:claude-haiku-4-5'),
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
