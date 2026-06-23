import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { platformEnum } from '../../../../agent/types.js';
import { bearerSecurity } from '../../../../common/constant.js';
import { productIdParams } from '../../../../schema/shared.js';
import { generateDrafts } from '../../../../services/generation.js';
import { getOwnedProduct } from '../../../../services/products.js';

const generateRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/products/:productId/generate',
    {
      schema: {
        tags: ['Generation (Step 4)'],
        summary: 'Generate post drafts',
        description:
          '⛔ Quality-gate endpoint. Runs the agent against the knowledge base, active learnings, and recent post topics to draft new posts, persisted as `PENDING_APPROVAL`. Omit the body to draft `postsPerWeek` posts spread across the next 7 days, round-robined across the configured platforms. Pass `draftCount` to target a batch size, `platforms` to restrict/round-robin across a subset (defaults to one draft per platform listed if `draftCount` is omitted), and/or `topic` to pin every draft in this call to one topic — omit `topic` and the agent proposes one from the knowledge base, avoiding recently posted topics. Records an `AgentRun` with token usage and cost; returns 402 if the business has hit its monthly spend cap (see `PATCH /businesses/me`).',
        security: bearerSecurity,
        params: productIdParams,
        body: z
          .object({
            draftCount: z.number().int().min(1).max(14).optional(),
            platforms: z.array(platformEnum).min(1).optional(),
            topic: z.string().min(1).max(200).optional(),
          })
          .meta({
            example: {
              draftCount: 2,
              platforms: ['FACEBOOK', 'INSTAGRAM'],
              topic: 'oferta de 6 luni gratuite',
            },
          }),
      },
    },
    async ({ params, body, business, server }) => {
      const product = await getOwnedProduct(params.productId, business.id);

      return generateDrafts(product, body, server.llmProvider);
    },
  );
};

export default generateRoutes;
