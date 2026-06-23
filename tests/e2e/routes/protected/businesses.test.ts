import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { App } from '../../../../src/app.js';
import { closeTestApp, createBusiness, createTestApp, resetDatabase } from '../../support.js';

describe('GET/PATCH /businesses/me', () => {
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

  it('returns the authenticated business profile without the API key hash', async () => {
    const owner = await createBusiness(app, { name: 'Profile Clinic' });

    const res = await app.inject({
      method: 'GET',
      url: '/businesses/me',
      headers: { authorization: `Bearer ${owner.body.apiKey}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      id: owner.body.business.id,
      name: 'Profile Clinic',
      defaultLanguage: 'en',
      timezone: 'Europe/Bucharest',
    });
    expect(res.json().apiKeyHash).toBeUndefined();
  });

  it('updates the authenticated business profile', async () => {
    const owner = await createBusiness(app, { name: 'Mutable Clinic' });

    const res = await app.inject({
      method: 'PATCH',
      url: '/businesses/me',
      headers: { authorization: `Bearer ${owner.body.apiKey}` },
      payload: {
        name: 'Mutable Clinic RO',
        defaultLanguage: 'ro',
        timezone: 'Europe/Berlin',
        telegramChatId: 'chat-42',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      name: 'Mutable Clinic RO',
      defaultLanguage: 'ro',
      timezone: 'Europe/Berlin',
      telegramChatId: 'chat-42',
    });
  });

  it('sets and clears the monthly spend cap', async () => {
    const owner = await createBusiness(app, { name: 'Budget Clinic' });
    const auth = { authorization: `Bearer ${owner.body.apiKey}` };

    const capped = await app.inject({
      method: 'PATCH',
      url: '/businesses/me',
      headers: auth,
      payload: { monthlySpendCapUsd: 50 },
    });
    expect(capped.statusCode).toBe(200);
    expect(Number(capped.json().monthlySpendCapUsd)).toBe(50);

    const cleared = await app.inject({
      method: 'PATCH',
      url: '/businesses/me',
      headers: auth,
      payload: { monthlySpendCapUsd: null },
    });
    expect(cleared.statusCode).toBe(200);
    expect(cleared.json().monthlySpendCapUsd).toBeNull();
  });

  it('rejects requests without a valid API key', async () => {
    const missing = await app.inject({
      method: 'GET',
      url: '/businesses/me',
    });

    const malformed = await app.inject({
      method: 'GET',
      url: '/businesses/me',
      headers: { authorization: 'Bearer invalid-token' },
    });

    expect(missing.statusCode).toBe(401);
    expect(malformed.statusCode).toBe(401);
  });
});
