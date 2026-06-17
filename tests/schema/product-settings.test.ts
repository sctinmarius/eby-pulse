import { describe, expect, it } from 'vitest';
import { productSettingsSchema } from '../../src/schema/product-settings.js';

describe('productSettingsSchema', () => {
  it('fills defaults for an empty object', () => {
    const settings = productSettingsSchema.parse({});
    expect(settings.platforms).toEqual(['FACEBOOK', 'INSTAGRAM']);
    expect(settings.language).toBe('ro-formal');
    expect(settings.postingCadence).toBe(5);
    expect(settings.contentMix).toEqual({
      educational: 40,
      feature: 30,
      socialProof: 20,
      offer: 10,
    });
  });

  it('rejects a contentMix that does not sum to 100', () => {
    const result = productSettingsSchema.safeParse({
      contentMix: { educational: 50, feature: 30, socialProof: 20, offer: 10 },
    });
    expect(result.success).toBe(false);
  });

  it('accepts per-task model overrides in providerId:modelId format', () => {
    const settings = productSettingsSchema.parse({
      models: { generate: 'openai:gpt-5', distill: 'anthropic:claude-haiku-4-5' },
    });
    expect(settings.models?.generate).toBe('openai:gpt-5');
    expect(productSettingsSchema.safeParse({ models: { generate: 'not-a-model' } }).success).toBe(
      false,
    );
  });
});
