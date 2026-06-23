import { constants as HttpStatusCodes } from 'node:http2';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { Prisma } from '../../../generated/prisma/client.js';
import { prisma } from '../../../libs/prisma.js';
import {
  productSettingsSchema,
  writableProductSettingsPatchSchema,
  writableProductSettingsSchema,
} from '../../../schema/product-settings.js';
import { productIdParams } from '../../../schema/shared.js';
import { getOwnedProduct } from '../../../services/products.js';
import { bearerSecurity } from '../../../common/constant.js';

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
        tags: ['Products (Step 2)'],
        summary: 'Create a product',
        description:
          'Registers a product under the authenticated business — one product per app/site the agent runs for. `slug` must be unique across all businesses. `settings` configures the posting strategy (platforms, language/formality, posts per week, content mix); omit it to use the defaults (Facebook + Instagram, `ro-formal`, 5/week, 40/30/20/10 mix).',
        security: bearerSecurity,
        body: z
          .object({
            name: z.string().min(2).max(150),
            slug: slugSchema,
            settings: writableProductSettingsSchema.optional(),
          })
          .meta({
            example: {
              name: 'Doctor Estimator',
              slug: 'doctor-estimator',
              settings: {
                platforms: ['FACEBOOK', 'INSTAGRAM'],
                language: 'ro-formal',
                postsPerWeek: 5,
                contentMix: { educational: 40, feature: 30, socialProof: 20, offer: 10 },
              },
            },
          }),
      },
    },
    async (request, reply) => {
      const settings = writableProductSettingsSchema.parse(request.body.settings ?? {});
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

  app.get(
    '/products',
    {
      schema: {
        tags: ['Products (Step 2)'],
        summary: 'List products',
        description: 'Lists every product owned by the authenticated business, oldest first.',
        security: bearerSecurity,
      },
    },
    async (request) =>
      prisma.product.findMany({
        where: { businessId: request.business.id },
        orderBy: { createdAt: 'asc' },
      }),
  );

  app.get(
    '/products/:productId',
    {
      schema: {
        tags: ['Products (Step 2)'],
        summary: 'Get a product',
        description:
          'Fetches one product by id. Returns 404 if it does not exist or is not owned by the authenticated business.',
        security: bearerSecurity,
        params: productIdParams,
      },
    },
    async (request) => getOwnedProduct(request.params.productId, request.business.id),
  );

  app.patch(
    '/products/:productId',
    {
      schema: {
        tags: ['Products (Step 2)'],
        summary: 'Update a product',
        description:
          'Updates the product name and/or settings. `settings` is a partial patch merged onto the existing settings — e.g. send only `{ "postsPerWeek": 3 }` to change cadence without touching the rest.',
        security: bearerSecurity,
        params: productIdParams,
        body: z
          .object({
            name: z.string().min(2).max(150).optional(),
            settings: writableProductSettingsPatchSchema.optional(),
          })
          .meta({ example: { settings: { postsPerWeek: 3 } } }),
      },
    },
    async (request) => {
      const product = await getOwnedProduct(request.params.productId, request.business.id);
      const settingsUpdate = request.body.settings
        ? writableProductSettingsPatchSchema.parse(request.body.settings)
        : undefined;
      const settings = settingsUpdate
        ? productSettingsSchema.parse({ ...(product.settings as object), ...settingsUpdate })
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
