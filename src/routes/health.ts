import type { FastifyPluginAsync } from 'fastify';

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Liveness check',
        description:
          'Returns `{ status: "ok" }` when the server is running. No authentication required — use this for container health checks and uptime monitors.',
      },
    },
    async () => ({ status: 'ok' }),
  );
};

export default healthRoutes;
