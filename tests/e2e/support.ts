import { buildApp, type App } from '../../src/app.js';
import { prisma } from '../../src/libs/prisma.js';

export const BOOTSTRAP = 'test-bootstrap-token-0123456789';

export async function createTestApp(): Promise<App> {
  const app = buildApp();
  await app.ready();
  return app;
}

export async function resetDatabase() {
  await prisma.business.deleteMany();
}

export async function closeTestApp(app: App) {
  await app.close();
  await prisma.$disconnect();
}

export async function createBusiness(
  app: App,
  payload: {
    name: string;
    defaultLanguage?: string;
    timezone?: string;
  },
) {
  const res = await app.inject({
    method: 'POST',
    url: '/businesses',
    headers: { 'x-bootstrap-token': BOOTSTRAP },
    payload,
  });

  return {
    response: res,
    body: res.json() as {
      business: {
        id: string;
        name: string;
        defaultLanguage: string;
        timezone: string;
        telegramChatId?: string | null;
      };
      apiKey: string;
    },
  };
}

export async function createProduct(
  app: App,
  auth: Record<string, string>,
  payload: {
    name: string;
    slug: string;
    settings?: Record<string, unknown>;
  },
) {
  const res = await app.inject({
    method: 'POST',
    url: '/products',
    headers: auth,
    payload,
  });

  return {
    response: res,
    body: res.json() as {
      id: string;
      name: string;
      slug: string;
      settings: {
        language: string;
        postingCadence: number;
        contentMix: Record<string, number>;
      };
    },
  };
}
