import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { generateApiKey } from '../libs/api-key.js';
import { config } from '../libs/config.js';
import { prisma } from '../libs/prisma.js';
import { sanitizeBusiness } from '../services/businesses.js';

const businessRoutes: FastifyPluginAsyncZod = async (app) => {
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

      return reply.code(201).send({ business: sanitizeBusiness(business), apiKey: key });
    },
  );
};

export default businessRoutes;
