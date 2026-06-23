import { z } from 'zod';
import {
  generateObjectWithRepair,
  type GenerateObjectUsage,
  type LlmProvider,
} from '../llm/provider.js';
import type { Platform } from '../types.js';

const regenerateSchema = z.object({ content: z.string().min(1) });

export interface RegenerateWithFeedbackInput {
  systemPrompt: string;
  platform: Platform;
  previousContent: string;
  feedback: string;
}

export interface RegenerateWithFeedbackResult {
  content: string;
  usage: GenerateObjectUsage;
}

export async function regenerateWithFeedback(
  llm: LlmProvider,
  model: string,
  input: RegenerateWithFeedbackInput,
): Promise<RegenerateWithFeedbackResult> {
  const prompt = [
    `Platform: ${input.platform}`,
    'Previous draft:',
    input.previousContent,
    'Owner feedback on the previous draft:',
    input.feedback,
    'Rewrite the post addressing the feedback. Output only the new post content.',
  ].join('\n\n');

  const result = await generateObjectWithRepair(llm, {
    model,
    schema: regenerateSchema,
    system: input.systemPrompt,
    prompt,
  });

  return { content: result.object.content, usage: result.usage };
}
