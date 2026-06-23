import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FakeLlmProvider } from '../../../../../src/agent/llm/provider.js';
import type { App } from '../../../../../src/app.js';
import { prisma } from '../../../../../src/libs/prisma.js';
import {
  closeTestApp,
  createBusiness,
  createProduct,
  createTestApp,
  resetDatabase,
} from '../../../support.js';

describe('POST /products/:productId/generate', () => {
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

  it('generates drafts, persists PENDING_APPROVAL posts, and records a SUCCEEDED AgentRun', async () => {
    const owner = await createBusiness(app, { name: 'Generate Clinic' });
    const auth = { authorization: `Bearer ${owner.body.apiKey}` };
    const product = await createProduct(app, auth, {
      name: 'Doctor Estimator',
      slug: 'doctor-estimator',
    });

    (app.llmProvider as FakeLlmProvider).enqueueObject({
      posts: [
        { platform: 'FACEBOOK', topic: 'free 6-month offer', content: 'Postare Facebook.' },
        { platform: 'INSTAGRAM', topic: 'value per hour', content: 'Postare Instagram.' },
      ],
    });

    const res = await app.inject({
      method: 'POST',
      url: `/products/${product.body.id}/generate`,
      headers: auth,
      payload: { draftCount: 2 },
    });

    expect(res.statusCode).toBe(200);
    const posts = res.json() as { platform: string; status: string; scheduledFor: string }[];
    expect(posts).toHaveLength(2);
    expect(posts.every((post) => post.status === 'PENDING_APPROVAL')).toBe(true);
    expect(new Date(posts[0]!.scheduledFor).getTime()).toBeLessThanOrEqual(
      new Date(posts[1]!.scheduledFor).getTime(),
    );

    const agentRuns = await prisma.agentRun.findMany({ where: { productId: product.body.id } });
    expect(agentRuns).toHaveLength(1);
    expect(agentRuns[0]?.status).toBe('SUCCEEDED');
    expect(agentRuns[0]?.task).toBe('GENERATE');
    expect(agentRuns[0]?.inputTokens).toBeGreaterThan(0);
    expect(Number(agentRuns[0]?.costUsd)).toBeGreaterThan(0);
  });

  it('keeps generation scoped to the owning business', async () => {
    const businessA = await createBusiness(app, { name: 'Business A' });
    const businessB = await createBusiness(app, { name: 'Business B' });

    const productA = await createProduct(
      app,
      { authorization: `Bearer ${businessA.body.apiKey}` },
      { name: 'Secret Product', slug: 'secret-product' },
    );

    const res = await app.inject({
      method: 'POST',
      url: `/products/${productA.body.id}/generate`,
      headers: { authorization: `Bearer ${businessB.body.apiKey}` },
      payload: { draftCount: 1 },
    });

    expect(res.statusCode).toBe(404);
  });

  it('round-robins across an explicit platforms array, defaulting draftCount to one per platform', async () => {
    const owner = await createBusiness(app, { name: 'Multi Platform Clinic' });
    const auth = { authorization: `Bearer ${owner.body.apiKey}` };
    const product = await createProduct(app, auth, {
      name: 'Doctor Estimator',
      slug: 'multi-platform-product',
    });

    (app.llmProvider as FakeLlmProvider).enqueueObject({
      posts: [
        { platform: 'FACEBOOK', topic: 'a', content: 'c1' },
        { platform: 'INSTAGRAM', topic: 'b', content: 'c2' },
      ],
    });

    const res = await app.inject({
      method: 'POST',
      url: `/products/${product.body.id}/generate`,
      headers: auth,
      payload: { platforms: ['FACEBOOK', 'INSTAGRAM'], topic: 'oferta de 6 luni gratuite' },
    });

    expect(res.statusCode).toBe(200);
    const posts = res.json() as { platform: string }[];
    expect(posts).toHaveLength(2);
  });

  it('blocks generation with 402 once the business monthly spend cap is reached', async () => {
    const owner = await createBusiness(app, { name: 'Capped Clinic' });
    const auth = { authorization: `Bearer ${owner.body.apiKey}` };
    const product = await createProduct(app, auth, {
      name: 'Doctor Estimator',
      slug: 'capped-product',
    });

    (app.llmProvider as FakeLlmProvider).enqueueObject({
      posts: [{ platform: 'FACEBOOK', topic: 'a', content: 'c1' }],
    });
    const first = await app.inject({
      method: 'POST',
      url: `/products/${product.body.id}/generate`,
      headers: auth,
      payload: { draftCount: 1 },
    });
    expect(first.statusCode).toBe(200);

    const spentSoFar = await prisma.agentRun.aggregate({
      where: { productId: product.body.id },
      _sum: { costUsd: true },
    });
    await prisma.business.update({
      where: { id: owner.body.business.id },
      data: { monthlySpendCapUsd: spentSoFar._sum.costUsd ?? 0 },
    });

    (app.llmProvider as FakeLlmProvider).enqueueObject({
      posts: [{ platform: 'FACEBOOK', topic: 'b', content: 'c2' }],
    });
    const second = await app.inject({
      method: 'POST',
      url: `/products/${product.body.id}/generate`,
      headers: auth,
      payload: { draftCount: 1 },
    });

    expect(second.statusCode).toBe(402);
    expect(second.json().error).toMatch(/monthly spend cap/i);
  });
});
