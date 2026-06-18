import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { App } from '../../../src/app.js';
import { closeTestApp, createBusiness, createTestApp, resetDatabase } from '../support.js';

describe('POST /businesses', () => {
  let app: App;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('creates a business and returns its API key once', async () => {
    const created = await createBusiness(app, { name: 'Clinic Growth Lab' });

    expect(created.response.statusCode).toBe(201);
    expect(created.body.business.name).toBe('Clinic Growth Lab');
    expect(created.body.business.defaultLanguage).toBe('en');
    expect(created.body.business.timezone).toBe('Europe/Bucharest');
    expect(created.body.apiKey.startsWith('ebp_live_')).toBe(true);
  });

  it('rejects an invalid bootstrap token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/businesses',
      headers: { 'x-bootstrap-token': 'wrong-token' },
      payload: { name: 'Nope' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('accepts explicit business bootstrap fields', async () => {
    const created = await createBusiness(app, {
      name: 'Configured Clinic',
      defaultLanguage: 'ro',
      timezone: 'Europe/Paris',
    });

    expect(created.response.statusCode).toBe(201);
    expect(created.body.business).toMatchObject({
      name: 'Configured Clinic',
      defaultLanguage: 'ro',
      timezone: 'Europe/Paris',
    });
  });

  it('should reject if the payload is invalid', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/businesses',
      headers: { 'x-bootstrap-token': 'wrong-token' },
      payload: { name: 'A' },
    });

    expect(res.statusCode).toBe(400);
  });
});
