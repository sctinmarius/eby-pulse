import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { constants as HttpStatusCodes } from 'node:http2';
import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../libs/prisma.js';
import { productSettingsSchema } from '../../schema/product-settings.js';
import { getOwnedProduct } from '../../services/products.js';
import { bearerSecurity } from '../../common/constant.js';

const slugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lowercase letters, digits and dashes only');

const productRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/products',
    {
      schema: {
        security: bearerSecurity,
        body: z.object({
          name: z.string().min(2).max(150),
          slug: slugSchema,
          settings: productSettingsSchema.optional(),
        }),
      },
    },
    async (request, reply) => {
      const settings = productSettingsSchema.parse(request.body.settings ?? {});
      try {
        const product = await prisma.product.create({
          data: {
            businessId: request.business.id,
            name: request.body.name,
            slug: request.body.slug,
            settings,
          },
        });
        return reply.code(HttpStatusCodes.HTTP_STATUS_CREATED).send(product);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          return reply
            .code(HttpStatusCodes.HTTP_STATUS_CONFLICT)
            .send({ error: 'Slug already in use' });
        }
        throw err;
      }
    },
  );

  app.get('/products', { schema: { security: bearerSecurity } }, async (request) =>
    prisma.product.findMany({
      where: { businessId: request.business.id },
      orderBy: { createdAt: 'asc' },
    }),
  );

  app.get(
    '/products/:productId',
    {
      schema: {
        security: bearerSecurity,
        params: z.object({ productId: z.string() }),
      },
    },
    async (request) => getOwnedProduct(request.params.productId, request.business.id),
  );

  app.patch(
    '/products/:productId',
    {
      schema: {
        security: bearerSecurity,
        params: z.object({ productId: z.string() }),
        body: z.object({
          name: z.string().min(2).max(150).optional(),
          settings: z.record(z.string(), z.unknown()).optional(),
        }),
      },
    },
    async (request) => {
      const product = await getOwnedProduct(request.params.productId, request.business.id);
      const settings = request.body.settings
        ? productSettingsSchema.parse({ ...(product.settings as object), ...request.body.settings })
        : undefined;

      return prisma.product.update({
        where: { id: product.id },
        data: {
          ...(request.body.name ? { name: request.body.name } : {}),
          ...(settings ? { settings } : {}),
        },
      });
    },
  );
};

export default productRoutes;
