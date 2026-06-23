import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FakeLlmProvider } from '../../../../src/agent/llm/provider.js';
import type { App } from '../../../../src/app.js';
import {
  closeTestApp,
  createBusiness,
  createProduct,
  createTestApp,
  resetDatabase,
} from '../../support.js';

async function generateOnce(app: App, auth: Record<string, string>, productId: string) {
  (app.llmProvider as FakeLlmProvider).enqueueObject({
    posts: [{ platform: 'FACEBOOK', topic: 'a', content: 'c1' }],
  });

  const res = await app.inject({
    method: 'POST',
    url: `/products/${productId}/generate`,
    headers: auth,
    payload: { draftCount: 1 },
  });
  expect(res.statusCode).toBe(200);
}

describe('GET /businesses/me/usage and /businesses/me/agent-runs', () => {
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

  it('reports zero spend with a null remaining when no cap is set and nothing has run', async () => {
    const owner = await createBusiness(app, { name: 'Fresh Clinic' });
    const auth = { authorization: `Bearer ${owner.body.apiKey}` };

    const res = await app.inject({ method: 'GET', url: '/businesses/me/usage', headers: auth });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ capUsd: null, spentUsd: 0, remainingUsd: null, breakdown: [] });
  });

  it('aggregates spend by task and model, and computes remainingUsd against the cap', async () => {
    const owner = await createBusiness(app, { name: 'Usage Clinic' });
    const auth = { authorization: `Bearer ${owner.body.apiKey}` };
    const product = await createProduct(app, auth, {
      name: 'Doctor Estimator',
      slug: 'usage-product',
    });

    await generateOnce(app, auth, product.body.id);
    await generateOnce(app, auth, product.body.id);

    await app.inject({
      method: 'PATCH',
      url: '/businesses/me',
      headers: auth,
      payload: { monthlySpendCapUsd: 50 },
    });

    const res = await app.inject({ method: 'GET', url: '/businesses/me/usage', headers: auth });

    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      capUsd: number;
      spentUsd: number;
      remainingUsd: number;
      breakdown: { task: string; model: string; runCount: number; costUsd: number }[];
    };
    expect(body.capUsd).toBe(50);
    expect(body.spentUsd).toBeGreaterThan(0);
    expect(body.remainingUsd).toBe(50 - body.spentUsd);
    expect(body.breakdown).toHaveLength(1);
    expect(body.breakdown[0]).toMatchObject({ task: 'GENERATE', runCount: 2 });
    expect(body.breakdown[0]?.costUsd).toBeCloseTo(body.spentUsd, 10);
  });

  it('only counts the authenticated business’s own runs', async () => {
    const owner = await createBusiness(app, { name: 'Isolated Clinic' });
    const other = await createBusiness(app, { name: 'Other Clinic' });
    const auth = { authorization: `Bearer ${owner.body.apiKey}` };
    const otherAuth = { authorization: `Bearer ${other.body.apiKey}` };
    const product = await createProduct(app, otherAuth, {
      name: 'Other Product',
      slug: 'other-product',
    });

    await generateOnce(app, otherAuth, product.body.id);

    const res = await app.inject({ method: 'GET', url: '/businesses/me/usage', headers: auth });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ spentUsd: 0, breakdown: [] });
  });

  it('lists agent runs newest first and paginates with a cursor', async () => {
    const owner = await createBusiness(app, { name: 'History Clinic' });
    const auth = { authorization: `Bearer ${owner.body.apiKey}` };
    const product = await createProduct(app, auth, {
      name: 'Doctor Estimator',
      slug: 'history-product',
    });

    await generateOnce(app, auth, product.body.id);
    await generateOnce(app, auth, product.body.id);
    await generateOnce(app, auth, product.body.id);

    const firstPage = await app.inject({
      method: 'GET',
      url: '/businesses/me/agent-runs?limit=2',
      headers: auth,
    });

    expect(firstPage.statusCode).toBe(200);
    const firstBody = firstPage.json() as {
      runs: { id: string; createdAt: string; product: { slug: string } }[];
      nextCursor: string | null;
    };
    expect(firstBody.runs).toHaveLength(2);
    expect(firstBody.runs[0]?.product.slug).toBe('history-product');
    expect(new Date(firstBody.runs[0]!.createdAt).getTime()).toBeGreaterThanOrEqual(
      new Date(firstBody.runs[1]!.createdAt).getTime(),
    );
    expect(firstBody.nextCursor).not.toBeNull();

    const secondPage = await app.inject({
      method: 'GET',
      url: `/businesses/me/agent-runs?limit=2&cursor=${firstBody.nextCursor}`,
      headers: auth,
    });

    const secondBody = secondPage.json() as { runs: { id: string }[]; nextCursor: string | null };
    expect(secondBody.runs).toHaveLength(1);
    expect(secondBody.nextCursor).toBeNull();
    expect(secondBody.runs.map((run) => run.id)).not.toContain(firstBody.runs[0]?.id);
    expect(secondBody.runs.map((run) => run.id)).not.toContain(firstBody.runs[1]?.id);
  });

  it('rejects requests without a valid API key', async () => {
    const usage = await app.inject({ method: 'GET', url: '/businesses/me/usage' });
    const runs = await app.inject({ method: 'GET', url: '/businesses/me/agent-runs' });

    expect(usage.statusCode).toBe(401);
    expect(runs.statusCode).toBe(401);
  });
});
