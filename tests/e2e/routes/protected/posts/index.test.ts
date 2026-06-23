import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FakeLlmProvider } from '../../../../../src/agent/llm/provider.js';
import type { App } from '../../../../../src/app.js';
import {
  closeTestApp,
  createBusiness,
  createProduct,
  createTestApp,
  resetDatabase,
} from '../../../support.js';

async function createPendingPost(app: App, auth: Record<string, string>, productId: string) {
  (app.llmProvider as FakeLlmProvider).enqueueObject({
    posts: [{ platform: 'FACEBOOK', topic: 'free 6-month offer', content: 'Draft content.' }],
  });

  const res = await app.inject({
    method: 'POST',
    url: `/products/${productId}/generate`,
    headers: auth,
    payload: { draftCount: 1 },
  });

  const body = res.json() as { id: string; status: string }[];
  return body[0]!;
}

describe('protected /posts routes', () => {
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

  it('approves a pending post', async () => {
    const owner = await createBusiness(app, { name: 'Posts Clinic' });
    const auth = { authorization: `Bearer ${owner.body.apiKey}` };
    const product = await createProduct(app, auth, {
      name: 'Doctor Estimator',
      slug: 'doctor-estimator',
    });
    const post = await createPendingPost(app, auth, product.body.id);

    const res = await app.inject({
      method: 'POST',
      url: `/posts/${post.id}/approve`,
      headers: auth,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('APPROVED');
  });

  it('rejects approving a post that is not pending approval', async () => {
    const owner = await createBusiness(app, { name: 'Double Approve Clinic' });
    const auth = { authorization: `Bearer ${owner.body.apiKey}` };
    const product = await createProduct(app, auth, {
      name: 'Doctor Estimator',
      slug: 'doctor-estimator',
    });
    const post = await createPendingPost(app, auth, product.body.id);

    await app.inject({ method: 'POST', url: `/posts/${post.id}/approve`, headers: auth });
    const second = await app.inject({
      method: 'POST',
      url: `/posts/${post.id}/approve`,
      headers: auth,
    });

    expect(second.statusCode).toBe(409);
  });

  it('skips a pending post', async () => {
    const owner = await createBusiness(app, { name: 'Skip Clinic' });
    const auth = { authorization: `Bearer ${owner.body.apiKey}` };
    const product = await createProduct(app, auth, {
      name: 'Doctor Estimator',
      slug: 'doctor-estimator',
    });
    const post = await createPendingPost(app, auth, product.body.id);

    const res = await app.inject({ method: 'POST', url: `/posts/${post.id}/skip`, headers: auth });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('SKIPPED');
  });

  it('marks an approved post as posted, but rejects marking a pending post as posted', async () => {
    const owner = await createBusiness(app, { name: 'Mark Posted Clinic' });
    const auth = { authorization: `Bearer ${owner.body.apiKey}` };
    const product = await createProduct(app, auth, {
      name: 'Doctor Estimator',
      slug: 'doctor-estimator',
    });
    const post = await createPendingPost(app, auth, product.body.id);

    const tooEarly = await app.inject({
      method: 'POST',
      url: `/posts/${post.id}/mark-posted`,
      headers: auth,
    });
    expect(tooEarly.statusCode).toBe(409);

    await app.inject({ method: 'POST', url: `/posts/${post.id}/approve`, headers: auth });
    const res = await app.inject({
      method: 'POST',
      url: `/posts/${post.id}/mark-posted`,
      headers: auth,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('POSTED');
  });

  it('regenerates content from feedback and keeps the post pending approval', async () => {
    const owner = await createBusiness(app, { name: 'Edit Clinic' });
    const auth = { authorization: `Bearer ${owner.body.apiKey}` };
    const product = await createProduct(app, auth, {
      name: 'Doctor Estimator',
      slug: 'doctor-estimator',
    });
    const post = await createPendingPost(app, auth, product.body.id);

    (app.llmProvider as FakeLlmProvider).enqueueObject({
      content: 'Conținut revizuit conform feedback-ului.',
    });

    const res = await app.inject({
      method: 'POST',
      url: `/posts/${post.id}/edit`,
      headers: auth,
      payload: { feedback: 'Faceți-l mai formal.' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('PENDING_APPROVAL');
    expect(res.json().content).toBe('Conținut revizuit conform feedback-ului.');
  });

  it('keeps post transitions scoped to the owning business', async () => {
    const businessA = await createBusiness(app, { name: 'Business A' });
    const businessB = await createBusiness(app, { name: 'Business B' });
    const authA = { authorization: `Bearer ${businessA.body.apiKey}` };
    const productA = await createProduct(app, authA, {
      name: 'Secret Product',
      slug: 'secret-product',
    });
    const post = await createPendingPost(app, authA, productA.body.id);

    const res = await app.inject({
      method: 'POST',
      url: `/posts/${post.id}/approve`,
      headers: { authorization: `Bearer ${businessB.body.apiKey}` },
    });

    expect(res.statusCode).toBe(404);
  });
});
