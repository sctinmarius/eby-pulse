import { constants as HttpStatusCodes } from 'node:http2';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  deleteSection,
  listSections,
  upsertSection,
  upsertSections,
} from '../../services/knowledge.js';
import { getOwnedProduct } from '../../services/products.js';
import { bearerSecurity } from '../../common/constant.js';

const kindParam = z.enum(['product', 'audience', 'tone', 'examples']);
const toKind = (value: z.infer<typeof kindParam>) =>
  value.toUpperCase() as 'PRODUCT' | 'AUDIENCE' | 'TONE' | 'EXAMPLES';

const sectionBody = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1),
});

const knowledgeRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/products/:productId/knowledge',
    {
      schema: {
        security: bearerSecurity,
        params: z.object({ productId: z.string() }),
      },
    },
    async ({ params, business }) => {
      const product = await getOwnedProduct(params.productId, business.id);

      return listSections(product.id);
    },
  );

  app.put(
    '/products/:productId/knowledge/:kind',
    {
      schema: {
        security: bearerSecurity,
        params: z.object({ productId: z.string(), kind: kindParam }),
        body: sectionBody,
      },
    },
    async ({ params, business, body }) => {
      const product = await getOwnedProduct(params.productId, business.id);

      return upsertSection(product.id, { kind: toKind(params.kind), ...body });
    },
  );

  app.delete(
    '/products/:productId/knowledge/:kind',
    {
      schema: {
        security: bearerSecurity,
        params: z.object({ productId: z.string(), kind: kindParam }),
      },
    },
    async ({ params, business }, reply) => {
      const product = await getOwnedProduct(params.productId, business.id);
      await deleteSection(product.id, toKind(params.kind));

      return reply.code(HttpStatusCodes.HTTP_STATUS_NO_CONTENT).send();
    },
  );

  app.post(
    '/products/:productId/knowledge/import',
    {
      schema: {
        security: bearerSecurity,
        params: z.object({ productId: z.string() }),
        body: z.object({
          sections: z
            .array(sectionBody.extend({ kind: kindParam }))
            .min(1)
            .max(4),
        }),
      },
    },
    async ({ params, business, body }) => {
      const product = await getOwnedProduct(params.productId, business.id);

      return upsertSections(
        product.id,
        body.sections.map((section) => ({
          ...section,
          kind: toKind(section.kind),
        })),
      );
    },
  );
};

export default knowledgeRoutes;
