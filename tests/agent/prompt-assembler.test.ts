import { describe, expect, it } from 'vitest';
import { assembleSystemPrompt } from '../../src/agent/prompt-assembler.js';

const settings = {
  platforms: ['FACEBOOK', 'INSTAGRAM'] as const,
  language: 'ro-formal',
  postsPerWeek: 5,
  contentMix: { educational: 40, feature: 30, socialProof: 20, offer: 10 },
};

describe('assembleSystemPrompt', () => {
  it('orders knowledge sections PRODUCT, AUDIENCE, TONE, EXAMPLES regardless of input order', () => {
    const prompt = assembleSystemPrompt({
      knowledgeSections: [
        { kind: 'EXAMPLES', title: 'Examples', content: 'example content' },
        { kind: 'PRODUCT', title: 'Product', content: 'product content' },
        { kind: 'TONE', title: 'Tone', content: 'tone content' },
        { kind: 'AUDIENCE', title: 'Audience', content: 'audience content' },
      ],
      activeLearnings: [],
      recentPostTopics: [],
      settings: { ...settings, platforms: [...settings.platforms] },
    });

    const productIndex = prompt.indexOf('product content');
    const audienceIndex = prompt.indexOf('audience content');
    const toneIndex = prompt.indexOf('tone content');
    const examplesIndex = prompt.indexOf('example content');

    expect(productIndex).toBeGreaterThan(-1);
    expect(productIndex).toBeLessThan(audienceIndex);
    expect(audienceIndex).toBeLessThan(toneIndex);
    expect(toneIndex).toBeLessThan(examplesIndex);
  });

  it('includes active learnings and recent topics when present', () => {
    const prompt = assembleSystemPrompt({
      knowledgeSections: [],
      activeLearnings: [{ category: 'TONE', content: 'Be more concise' }],
      recentPostTopics: ['free 6-month offer'],
      settings: { ...settings, platforms: [...settings.platforms] },
    });

    expect(prompt).toContain('Be more concise');
    expect(prompt).toContain('free 6-month offer');
  });

  it('falls back to "None yet." when there are no learnings or recent topics', () => {
    const prompt = assembleSystemPrompt({
      knowledgeSections: [],
      activeLearnings: [],
      recentPostTopics: [],
      settings: { ...settings, platforms: [...settings.platforms] },
    });

    expect(prompt).toContain('Learnings from past performance\n\nNone yet.');
    expect(prompt).toContain('Recently posted topics — do not repeat these\n\nNone yet.');
  });

  it('includes platform/language rules derived from settings', () => {
    const prompt = assembleSystemPrompt({
      knowledgeSections: [],
      activeLearnings: [],
      recentPostTopics: [],
      settings: { ...settings, platforms: [...settings.platforms] },
    });

    expect(prompt).toContain('ro-formal');
    expect(prompt).toContain('FACEBOOK, INSTAGRAM');
  });
});
