import { z } from 'zod';
import {
  generateObjectWithRepair,
  type GenerateObjectUsage,
  type LlmProvider,
} from '../llm/provider.js';
import { platformEnum, type GeneratedPost, type Platform } from '../types.js';

function draftSchema(count: number) {
  return z.object({
    posts: z
      .array(
        z.object({
          platform: platformEnum,
          topic: z.string().min(1),
          content: z.string().min(1),
        }),
      )
      .length(count),
  });
}

export interface GeneratePostsInput {
  systemPrompt: string;
  count: number;
  platforms: Platform[];
  topic?: string;
}

export interface GeneratePostsResult {
  posts: GeneratedPost[];
  usage: GenerateObjectUsage;
}

export async function generatePosts(
  llm: LlmProvider,
  model: string,
  input: GeneratePostsInput,
): Promise<GeneratePostsResult> {
  const promptLines = [
    `Write ${input.count} social media post draft(s), one per item below.`,
    'Platforms (write the post for the platform listed at that position):',
    ...input.platforms.map((platform, index) => `${index + 1}. ${platform}`),
  ];

  if (input.topic) {
    promptLines.push(`Every post must be about this topic: ${input.topic}.`);
  } else {
    promptLines.push(
      'Choose a distinct, concrete topic for each post. Do not repeat topics within this batch or the recently posted topics listed in the system prompt.',
    );
  }

  const result = await generateObjectWithRepair(llm, {
    model,
    schema: draftSchema(input.count),
    system: input.systemPrompt,
    prompt: promptLines.join('\n'),
  });

  return { posts: result.object.posts, usage: result.usage };
}
