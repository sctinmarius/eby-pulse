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
