import { z } from 'zod';

const portSchema = z.coerce.number().int().positive();

const modelId = z
  .string()
  .regex(
    /^[a-z0-9-]+:.+$/i,
    'expected format providerId:modelId (e.g. anthropic:claude-sonnet-4-5)',
  );

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: portSchema.optional(),
    API_PORT: portSchema.optional(),
    DATABASE_URL: z.string().min(1),
    BOOTSTRAP_TOKEN: z.string().min(16),
    ANTHROPIC_API_KEY: z.string().optional(),
    TELEGRAM_BOT_TOKEN: z.string().optional(),
    MODEL_GENERATE: modelId.default('anthropic:claude-sonnet-4-5'),
    MODEL_RECOMMEND: modelId.default('anthropic:claude-sonnet-4-5'),
    MODEL_REGENERATE: modelId.default('anthropic:claude-sonnet-4-5'),
    MODEL_DISTILL: modelId.default('anthropic:claude-haiku-4-5'),
  })
  .transform((env) => ({
    ...env,
    PORT: env.PORT ?? env.API_PORT ?? 3030,
  }))
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'test' && !env.ANTHROPIC_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['ANTHROPIC_API_KEY'],
        message: 'required unless NODE_ENV=test',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}

export const config = parsed.data;
export type Config = typeof config;
