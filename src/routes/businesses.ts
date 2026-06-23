import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { constants as HttpStatusCodes } from 'node:http2';
import { generateApiKey } from '../libs/api-key.js';
import { config } from '../libs/config.js';
import { prisma } from '../libs/prisma.js';
import { sanitizeBusiness } from '../services/businesses.js';

const businessRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/businesses',
    {
      schema: {
        tags: ['Business (Step 1)'],
        summary: 'Bootstrap a new business',
        description:
          'Creates the first business (tenant) for this deployment and returns its API key once, in plaintext — only the SHA-256 hash is stored, so save it immediately. Requires the deployment-wide `x-bootstrap-token` header (the `BOOTSTRAP_TOKEN` env var), not a business API key. This is the first call you make against a fresh eby-pulse instance.',
        security: [{ bootstrapToken: [] }],
        body: z
          .object({
            name: z.string().min(2).max(150),
            defaultLanguage: z.string().min(2).max(20).default('en'),
            timezone: z.string().min(3).max(50).default('Europe/Bucharest'),
          })
          .meta({
            example: {
              name: 'Doctor Estimator',
              defaultLanguage: 'ro',
              timezone: 'Europe/Bucharest',
            },
          }),
      },
    },
    async (request, reply) => {
      if (request.headers['x-bootstrap-token'] !== config.BOOTSTRAP_TOKEN) {
        return reply
          .code(HttpStatusCodes.HTTP_STATUS_UNAUTHORIZED)
          .send({ error: 'Invalid bootstrap token' });
      }

      const { key, hash } = generateApiKey();
      const business = await prisma.business.create({
        data: { ...request.body, apiKeyHash: hash },
      });

      return reply
        .code(HttpStatusCodes.HTTP_STATUS_CREATED)
        .send({ business: sanitizeBusiness(business), apiKey: key });
    },
  );
};

export default businessRoutes;
