import Fastify, { type FastifyError, type FastifyReply, type FastifyRequest } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  hasZodFastifySchemaValidationErrors,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { ZodError } from 'zod';
import { authenticate } from './lib/auth.js';
import { config } from './lib/config.js';
import { knowledgeRoutes } from './modules/knowledge/routes.js';
import { businessPublicRoutes, businessRoutes } from './modules/tenants/business-routes.js';
import { productRoutes } from './modules/tenants/product-routes.js';

export type App = ReturnType<typeof buildApp>;

export function buildApp() {
  const app = Fastify({
    logger: config.NODE_ENV !== 'test' && { level: 'info' },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply
        .code(400)
        .send({ error: 'Validation failed', details: error.validation });
    }
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: 'Validation failed', details: error.issues });
    }
    if (error.statusCode !== undefined && error.statusCode < 500) {
      return reply.code(error.statusCode).send({ error: error.message });
    }
    request.log.error(error);
    return reply.code(500).send({ error: 'Internal server error' });
  });

  app.get('/health', async () => ({ status: 'ok' }));

  app.register(businessPublicRoutes);

  app.register(async (authed) => {
    authed.addHook('onRequest', authenticate);
    await authed.register(businessRoutes);
    await authed.register(productRoutes);
    await authed.register(knowledgeRoutes);
  });

  return app;
}
