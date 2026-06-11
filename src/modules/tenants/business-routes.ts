import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Business } from '../../generated/prisma/client.js';
import { generateApiKey } from '../../lib/api-key.js';
import { config } from '../../lib/config.js';
import { prisma } from '../../lib/prisma.js';

function sanitize(business: Business) {
  const { apiKeyHash: _apiKeyHash, ...safe } = business;
  return safe;
}

/** Public: tenant creation, protected by the bootstrap token. */
export const businessPublicRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/businesses',
    {
      schema: {
        body: z.object({
          name: z.string().min(2).max(150),
          defaultLanguage: z.string().min(2).max(20).default('en'),
          timezone: z.string().min(3).max(50).default('Europe/Bucharest'),
        }),
      },
    },
    async (request, reply) => {
      if (request.headers['x-bootstrap-token'] !== config.BOOTSTRAP_TOKEN) {
        return reply.code(401).send({ error: 'Invalid bootstrap token' });
      }
      const { key, hash } = generateApiKey();
      const business = await prisma.business.create({
        data: { ...request.body, apiKeyHash: hash },
      });
      // The plain key is shown exactly once; only its hash is stored.
      return reply.code(201).send({ business: sanitize(business), apiKey: key });
    },
  );
};

/** Authenticated: the calling business manages itself. */
export const businessRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/businesses/me', async (request) => sanitize(request.business));

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
      return sanitize(updated);
    },
  );
};
