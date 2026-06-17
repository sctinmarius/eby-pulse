import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { App } from '../../../src/app.js';
import { closeTestApp, createTestApp } from '../support.js';

describe('GET /docs and /docs/json', () => {
  let app: App;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('does not expose swagger documentation outside local development', async () => {
    const docs = await app.inject({ method: 'GET', url: '/docs' });
    const docsJson = await app.inject({ method: 'GET', url: '/docs/json' });

    expect(docs.statusCode).toBe(404);
    expect(docsJson.statusCode).toBe(404);
  });
});
