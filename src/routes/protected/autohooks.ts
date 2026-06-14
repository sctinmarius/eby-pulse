import type { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../lib/auth.js';

const protectedRoutesHooks: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', authenticate);
};

export default protectedRoutesHooks;