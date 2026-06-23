import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { bearerSecurity } from '../../../../common/constant.js';
import { prisma } from '../../../../libs/prisma.js';
import { productIdParams } from '../../../../schema/shared.js';
import { getOwnedProduct } from '../../../../services/products.js';

const postStatusEnum = z.enum(['PENDING_APPROVAL', 'APPROVED', 'SKIPPED', 'POSTED']);

const productPostsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/products/:productId/posts',
    {
      schema: {
        tags: ['Posts (Step 5)'],
        summary: 'List posts',
        description:
          'Lists drafted/approved/skipped/posted posts for a product, ordered by scheduled date. Filter with `?status=PENDING_APPROVAL` to see what is waiting for review.',
        security: bearerSecurity,
        params: productIdParams,
        querystring: z
          .object({ status: postStatusEnum.optional() })
          .meta({ example: { status: 'PENDING_APPROVAL' } }),
      },
    },
    async ({ params, query, business }) => {
      const product = await getOwnedProduct(params.productId, business.id);

      return prisma.post.findMany({
        where: { productId: product.id, ...(query.status ? { status: query.status } : {}) },
        orderBy: { scheduledFor: 'asc' },
      });
    },
  );
};

export default productPostsRoutes;
