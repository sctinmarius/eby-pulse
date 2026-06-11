import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { getOwnedProduct } from '../tenants/service.js';
import { deleteSection, listSections, upsertSection, upsertSections } from './service.js';

const kindParam = z.enum(['product', 'audience', 'tone', 'examples']);
const toKind = (value: z.infer<typeof kindParam>) =>
  value.toUpperCase() as 'PRODUCT' | 'AUDIENCE' | 'TONE' | 'EXAMPLES';

const sectionBody = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1),
});

export const knowledgeRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/products/:productId/knowledge',
    { schema: { params: z.object({ productId: z.string() }) } },
    async (request) => {
      const product = await getOwnedProduct(request.params.productId, request.business.id);
      return listSections(product.id);
    },
  );

  app.put(
    '/products/:productId/knowledge/:kind',
    {
      schema: {
        params: z.object({ productId: z.string(), kind: kindParam }),
        body: sectionBody,
      },
    },
    async (request) => {
      const product = await getOwnedProduct(request.params.productId, request.business.id);
      return upsertSection(product.id, { kind: toKind(request.params.kind), ...request.body });
    },
  );

  app.delete(
    '/products/:productId/knowledge/:kind',
    { schema: { params: z.object({ productId: z.string(), kind: kindParam }) } },
    async (request, reply) => {
      const product = await getOwnedProduct(request.params.productId, request.business.id);
      await deleteSection(product.id, toKind(request.params.kind));
      return reply.code(204).send();
    },
  );

  app.post(
    '/products/:productId/knowledge/import',
    {
      schema: {
        params: z.object({ productId: z.string() }),
        body: z.object({
          sections: z.array(sectionBody.extend({ kind: kindParam })).min(1).max(4),
        }),
      },
    },
    async (request) => {
      const product = await getOwnedProduct(request.params.productId, request.business.id);
      return upsertSections(
        product.id,
        request.body.sections.map((s) => ({ ...s, kind: toKind(s.kind) })),
      );
    },
  );
};
