import { z } from 'zod';

export const modelIdSchema = z
  .string()
  .regex(
    /^[a-z0-9-]+:.+$/i,
    'expected format providerId:modelId (e.g. anthropic:claude-sonnet-4-5)',
  );

export const productIdParams = z.object({ productId: z.string() });
export const postIdParams = z.object({ postId: z.string() });
