import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { App } from '../../../src/app.js';
import { closeTestApp, createTestApp } from '../support.js';

describe('GET /health', () => {
  let app: App;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('returns the health status payload', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });
});
