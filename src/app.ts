import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import autoLoad from '@fastify/autoload';
import Fastify from 'fastify';
import { type ZodTypeProvider } from 'fastify-type-provider-zod';
import { config } from './libs/config.js';

export type App = ReturnType<typeof buildApp>;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function buildApp() {
  const app = Fastify({
    logger: config.NODE_ENV !== 'test' && { level: process.env.LOG_LEVEL || 'info' },
  }).withTypeProvider<ZodTypeProvider>();

  app.register(autoLoad, {
    dir: join(__dirname, 'plugins'),
    encapsulate: false,
    ignorePattern: /.*(?:test|spec)\.(?:js|cjs|mjs|ts)$/,
  });

  app.register(autoLoad, {
    dir: join(__dirname, 'routes'),
    autoHooks: true,
    cascadeHooks: true,
    dirNameRoutePrefix: false,
    ignorePattern: /.*(?:test|spec)\.(?:js|cjs|mjs|ts)$/,
  });

  return app;
}
