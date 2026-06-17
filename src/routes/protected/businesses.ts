import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { prisma } from '../../libs/prisma.js';
import { sanitizeBusiness } from '../../services/businesses.js';

const protectedBusinessRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/businesses/me', async (request) => sanitizeBusiness(request.business));

  app.patch(
    '/businesses/me',
    {
      schema: {
        body: z.object({
          name: z.string().min(2).max(150).optional(),
          defaultLanguage: z.string().min(2).max(20).optional(),
          timezone: z.string().min(3).max(50).optional(),
          telegramChatId: z.string().nullable().optional(),
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
};

export default protectedBusinessRoutes;
