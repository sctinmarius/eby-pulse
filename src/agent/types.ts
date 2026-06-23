import { z } from 'zod';

export const platformEnum = z.enum(['FACEBOOK', 'INSTAGRAM']);
export type Platform = z.infer<typeof platformEnum>;

export type KnowledgeKind = 'PRODUCT' | 'AUDIENCE' | 'TONE' | 'EXAMPLES';

export interface KnowledgeSectionInput {
  kind: KnowledgeKind;
  title: string;
  content: string;
}

export type LearningCategory = 'TONE' | 'TOPIC' | 'FORMAT' | 'TIMING';

export interface LearningInput {
  category: LearningCategory;
  content: string;
}

export interface ContentMix {
  educational: number;
  feature: number;
  socialProof: number;
  offer: number;
}

export interface ProductSettingsInput {
  platforms: Platform[];
  language: string;
  postsPerWeek: number;
  contentMix: ContentMix;
}

export interface GeneratedPost {
  platform: Platform;
  topic: string;
  content: string;
}
