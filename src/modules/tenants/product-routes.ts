import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { getOwnedProduct } from './service.js';
import { productSettingsSchema } from './settings.js';

const slugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'lowercase letters, digits and dashes only');

export const productRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/products',
    {
      schema: {
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
        return reply.code(201).send(product);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          return reply.code(409).send({ error: 'Slug already in use' });
        }
        throw err;
      }
    },
  );

  app.get('/products', async (request) =>
    prisma.product.findMany({
      where: { businessId: request.business.id },
      orderBy: { createdAt: 'asc' },
    }),
  );

  app.get(
    '/products/:productId',
    { schema: { params: z.object({ productId: z.string() }) } },
    async (request) => getOwnedProduct(request.params.productId, request.business.id),
  );

  app.patch(
    '/products/:productId',
    {
      schema: {
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
        ? // Partial update: merge over current settings, then re-validate the whole object.
          productSettingsSchema.parse({ ...(product.settings as object), ...request.body.settings })
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
