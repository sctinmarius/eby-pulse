import type { FastifyPluginAsync } from 'fastify';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import { config } from '../libs/config.js';

const swaggerPlugin: FastifyPluginAsync = async (app) => {
  if (config.NODE_ENV !== 'development') {
    return;
  }

  const [{ default: fastifySwagger }, { default: fastifySwaggerUi }] = await Promise.all([
    import('@fastify/swagger'),
    import('@fastify/swagger-ui'),
  ]);

  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'eby-pulse API',
        description: 'Local development OpenAPI documentation for eby-pulse.',
        version: '0.1.0',
      },
      servers: [
        { url: `http://localhost:${config.PORT}`, description: 'Local development server' },
      ],
      tags: [
        { name: 'Health', description: 'Liveness check — no authentication required.' },
        {
          name: 'Business (Step 1)',
          description:
            'Step 1 — create a business once via the bootstrap token, then manage its profile. Every other endpoint is scoped to the business that owns the bearer token returned here.',
        },
        {
          name: 'Products (Step 2)',
          description:
            'Step 2 — a business can run the agent for one or more products. Create a product and configure its posting strategy (platforms, language, cadence, content mix).',
        },
        {
          name: 'Knowledge (Step 3)',
          description:
            'Step 3 — teach the agent about the product before generating anything: what it is, who it is for, how it should sound, and example posts to anchor style.',
        },
        {
          name: 'Generation (Step 4)',
          description:
            'Step 4 — ⛔ quality gate. Trigger the agent to draft posts from the knowledge base. Do not move on to recommendations/Telegram (Phase 3+) until generated drafts are publishable without rewriting.',
        },
        {
          name: 'Posts (Step 5)',
          description:
            'Step 5 — review drafts, approve/skip/edit them, and mark them posted once published manually on Facebook/Instagram.',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'API key',
            description:
              'Business API key returned at creation time. Swagger UI sends it as Authorization: Bearer <token>.',
          },
          bootstrapToken: {
            type: 'apiKey',
            in: 'header',
            name: 'x-bootstrap-token',
            description: 'Bootstrap token required only for POST /businesses.',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    staticCSP: true,
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });
};

export default swaggerPlugin;
