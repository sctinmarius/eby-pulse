import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../../libs/prisma.js';
import { sanitizeBusiness } from '../../services/businesses.js';
import { getMonthlyUsage, listAgentRuns } from '../../services/usage.js';
import { bearerSecurity } from '../../common/constant.js';

const protectedBusinessRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/businesses/me',
    {
      schema: {
        tags: ['Business (Step 1)'],
        summary: 'Get the authenticated business profile',
        description:
          'Returns the business that owns the bearer token used to authenticate, without its API key hash. Use this to confirm which tenant your key resolves to.',
        security: bearerSecurity,
      },
    },
    async (request) => sanitizeBusiness(request.business),
  );

  app.patch(
    '/businesses/me',
    {
      schema: {
        tags: ['Business (Step 1)'],
        summary: 'Update the authenticated business profile',
        description:
          "Updates name, default language, timezone, the Telegram chat id used for delivery (wiring lands in Phase 4), and/or the monthly spend cap. All fields are optional — only the ones provided are changed. `monthlySpendCapUsd` hard-blocks every agent call (generate/edit/recommend/distill) with a 402 once this calendar month's summed `AgentRun.costUsd` reaches it; send `null` to remove the cap.",
        security: bearerSecurity,
        body: z
          .object({
            name: z.string().min(2).max(150).optional(),
            defaultLanguage: z.string().min(2).max(20).optional(),
            timezone: z.string().min(3).max(50).optional(),
            telegramChatId: z.string().nullable().optional(),
            monthlySpendCapUsd: z.number().positive().nullable().optional(),
          })
          .meta({
            example: {
              defaultLanguage: 'ro',
              timezone: 'Europe/Bucharest',
              monthlySpendCapUsd: 50,
            },
          }),
      },
    },
    async (request) => {
      const updated = await prisma.business.update({
        where: { id: request.business.id },
        data: request.body,
      });
      return sanitizeBusiness(updated);
    },
  );

  app.get(
    '/businesses/me/usage',
    {
      schema: {
        tags: ['Business (Step 1)'],
        summary: 'Get this month’s agent spend',
        description:
          'Returns this calendar month’s spend against `monthlySpendCapUsd` (UTC month boundary, same window `runAgentTask` uses to enforce the cap), broken down by task and model. `remainingUsd` is `null` when no cap is set. Use this for a dashboard view; use `GET /businesses/me/agent-runs` to drill into individual calls.',
        security: bearerSecurity,
      },
    },
    async (request) =>
      getMonthlyUsage(
        request.business.id,
        request.business.monthlySpendCapUsd === null
          ? null
          : Number(request.business.monthlySpendCapUsd),
      ),
  );

  app.get(
    '/businesses/me/agent-runs',
    {
      schema: {
        tags: ['Business (Step 1)'],
        summary: 'List agent run history',
        description:
          'Paginated raw history of every agent call (generate/edit/recommend/distill) across all of this business’s products, newest first — tokens, cost, model, status, and error if it failed. Pass the previous response’s `nextCursor` as `cursor` to fetch the next page.',
        security: bearerSecurity,
        querystring: z
          .object({
            limit: z.coerce.number().int().min(1).max(100).default(20),
            cursor: z.string().optional(),
          })
          .meta({ example: { limit: 20 } }),
      },
    },
    async (request) => listAgentRuns(request.business.id, request.query),
  );
};

export default protectedBusinessRoutes;
