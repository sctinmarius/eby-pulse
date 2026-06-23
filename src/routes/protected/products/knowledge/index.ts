import { constants as HttpStatusCodes } from 'node:http2';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  deleteSection,
  listSections,
  upsertSection,
  upsertSections,
} from '../../../../services/knowledge.js';
import { getOwnedProduct } from '../../../../services/products.js';
import { bearerSecurity } from '../../../../common/constant.js';
import { productIdParams } from '../../../../schema/shared.js';

const kindParam = z.enum(['product', 'audience', 'tone', 'examples']);
const toKind = (value: z.infer<typeof kindParam>) =>
  value.toUpperCase() as 'PRODUCT' | 'AUDIENCE' | 'TONE' | 'EXAMPLES';

const sectionBody = z
  .object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1),
  })
  .meta({
    example: {
      content:
        '# Doctor Estimator — ce este produsul\n\nAplicație web pentru medicii din România care colaborează cu una sau mai multe clinici.',
    },
  });

const knowledgeRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/products/:productId/knowledge',
    {
      schema: {
        tags: ['Knowledge (Step 3)'],
        summary: 'List knowledge sections',
        description:
          'Returns the product knowledge base — up to four markdown sections (product, audience, tone, examples) the agent reads before drafting anything.',
        security: bearerSecurity,
        params: productIdParams,
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
        tags: ['Knowledge (Step 3)'],
        summary: 'Create or replace a knowledge section',
        description:
          'Upserts one section by kind (`product`, `audience`, `tone`, or `examples`). Content is markdown; `title` defaults to the first `# heading` in the content if omitted. This is the main lever for fixing low-quality drafts during the Phase 2 quality gate — tighten the tone/examples sections here, then regenerate.',
        security: bearerSecurity,
        params: productIdParams.extend({ kind: kindParam }),
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
        tags: ['Knowledge (Step 3)'],
        summary: 'Delete a knowledge section',
        description:
          'Removes one section by kind. Returns 204 on success, even if the section did not exist.',
        security: bearerSecurity,
        params: productIdParams.extend({ kind: kindParam }),
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
        tags: ['Knowledge (Step 3)'],
        summary: 'Bulk import knowledge sections',
        description:
          'Upserts 1-4 sections in one call — the bulk counterpart of `PUT .../knowledge/:kind`, used by the `pnpm knowledge:import` CLI to load `product.md`/`audience.md`/`tone.md`/`examples.md` from disk.',
        security: bearerSecurity,
        params: productIdParams,
        body: z
          .object({
            sections: z
              .array(sectionBody.extend({ kind: kindParam }))
              .min(1)
              .max(4),
          })
          .meta({
            example: {
              sections: [
                {
                  kind: 'tone',
                  content:
                    '# Reguli de ton și stil\n\nRomână formală, adresare cu „dumneavoastră".',
                },
                {
                  kind: 'examples',
                  content: '# Exemple de postări aprobate\n\nCâte ore ați petrecut luna trecută...',
                },
              ],
            },
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
