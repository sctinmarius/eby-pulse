import { z } from 'zod';
import { platformEnum } from '../agent/types.js';
import { modelIdSchema } from './shared.js';

const modelOverridesSchema = z
  .object({
    generate: modelIdSchema.optional(),
    recommend: modelIdSchema.optional(),
    regenerate: modelIdSchema.optional(),
    distill: modelIdSchema.optional(),
  })
  .optional();

export const contentMixSchema = z
  .object({
    educational: z.number().int().min(0).max(100),
    feature: z.number().int().min(0).max(100),
    socialProof: z.number().int().min(0).max(100),
    offer: z.number().int().min(0).max(100),
  })
  .refine(
    (mix) => mix.educational + mix.feature + mix.socialProof + mix.offer === 100,
    'contentMix percentages must sum to 100',
  );

export const productSettingsSchema = z.object({
  platforms: z.array(platformEnum).min(1).default(['FACEBOOK', 'INSTAGRAM']),
  language: z.string().min(2).default('ro-formal'),
  postsPerWeek: z.number().int().min(1).max(14).default(5),
  contentMix: contentMixSchema.default({
    educational: 40,
    feature: 30,
    socialProof: 20,
    offer: 10,
  }),
  models: modelOverridesSchema,
});

export const writableProductSettingsSchema = productSettingsSchema.omit({ models: true }).strict();

export const writableProductSettingsPatchSchema = writableProductSettingsSchema.partial();

export type ProductSettings = z.infer<typeof productSettingsSchema>;
