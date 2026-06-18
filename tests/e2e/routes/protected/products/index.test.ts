import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { App } from '../../../../../src/app.js';
import {
  closeTestApp,
  createBusiness,
  createProduct,
  createTestApp,
  resetDatabase,
} from '../../../support.js';

describe('protected /products routes', () => {
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

  it('creates, lists, fetches, and updates products with merged settings', async () => {
    const owner = await createBusiness(app, { name: 'Product Clinic' });

    const created = await createProduct(
      app,
      { authorization: `Bearer ${owner.body.apiKey}` },
      {
        name: 'Doctor Estimator',
        slug: 'doctor-estimator',
      },
    );

    expect(created.response.statusCode).toBe(201);
    expect(created.body.settings.language).toBe('ro-formal');
    expect(created.body.settings.postsPerWeek).toBe(5);
    expect(created.body.settings.contentMix).toEqual({
      educational: 40,
      feature: 30,
      socialProof: 20,
      offer: 10,
    });

    const list = await app.inject({
      method: 'GET',
      url: '/products',
      headers: { authorization: `Bearer ${owner.body.apiKey}` },
    });

    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);
    expect(list.json()[0].id).toBe(created.body.id);

    const fetched = await app.inject({
      method: 'GET',
      url: `/products/${created.body.id}`,
      headers: { authorization: `Bearer ${owner.body.apiKey}` },
    });

    expect(fetched.statusCode).toBe(200);
    expect(fetched.json()).toMatchObject({
      id: created.body.id,
      name: 'Doctor Estimator',
      slug: 'doctor-estimator',
    });

    const patched = await app.inject({
      method: 'PATCH',
      url: `/products/${created.body.id}`,
      headers: { authorization: `Bearer ${owner.body.apiKey}` },
      payload: {
        name: 'Doctor Estimator Pro',
        settings: { postsPerWeek: 3 },
      },
    });

    expect(patched.statusCode).toBe(200);
    expect(patched.json().name).toBe('Doctor Estimator Pro');
    expect(patched.json().settings.postsPerWeek).toBe(3);
    expect(patched.json().settings.language).toBe('ro-formal');
    expect(patched.json().settings.contentMix).toEqual({
      educational: 40,
      feature: 30,
      socialProof: 20,
      offer: 10,
    });
  });

  it('rejects invalid auth, invalid content mix, and duplicate slugs', async () => {
    const missingAuth = await app.inject({ method: 'GET', url: '/products' });
    const malformedAuth = await app.inject({
      method: 'GET',
      url: '/products',
      headers: { authorization: 'Bearer invalid-token' },
    });

    expect(missingAuth.statusCode).toBe(401);
    expect(malformedAuth.statusCode).toBe(401);

    const owner = await createBusiness(app, { name: 'Validation Clinic' });
    const auth = { authorization: `Bearer ${owner.body.apiKey}` };
    const created = await createProduct(app, auth, {
      name: 'Validation Product',
      slug: 'validation-product',
    });

    const invalidContentMix = await app.inject({
      method: 'PATCH',
      url: `/products/${created.body.id}`,
      headers: auth,
      payload: {
        settings: {
          contentMix: { educational: 90, feature: 30, socialProof: 20, offer: 10 },
        },
      },
    });

    expect(invalidContentMix.statusCode).toBe(400);

    const clientModelsOverride = await app.inject({
      method: 'POST',
      url: '/products',
      headers: auth,
      payload: {
        name: 'No Model Override',
        slug: 'no-model-override',
        settings: {
          models: { generate: 'openai:gpt-5' },
        },
      },
    });

    expect(clientModelsOverride.statusCode).toBe(400);

    const duplicateSameBusiness = await app.inject({
      method: 'POST',
      url: '/products',
      headers: auth,
      payload: { name: 'Duplicate', slug: 'validation-product' },
    });

    expect(duplicateSameBusiness.statusCode).toBe(409);
    expect(duplicateSameBusiness.json()).toMatchObject({ error: 'Slug already in use' });

    const otherBusiness = await createBusiness(app, { name: 'Other Validation Clinic' });
    const duplicateOtherBusiness = await app.inject({
      method: 'POST',
      url: '/products',
      headers: { authorization: `Bearer ${otherBusiness.body.apiKey}` },
      payload: { name: 'Still Duplicate', slug: 'validation-product' },
    });

    expect(duplicateOtherBusiness.statusCode).toBe(409);
  });

  it('keeps product access scoped to the authenticated business', async () => {
    const businessA = await createBusiness(app, { name: 'Business A' });
    const businessB = await createBusiness(app, { name: 'Business B' });

    const productA = await createProduct(
      app,
      { authorization: `Bearer ${businessA.body.apiKey}` },
      { name: 'Secret Product', slug: 'secret-product' },
    );

    const listB = await app.inject({
      method: 'GET',
      url: '/products',
      headers: { authorization: `Bearer ${businessB.body.apiKey}` },
    });

    expect(listB.statusCode).toBe(200);
    expect(listB.json()).toHaveLength(0);

    const getB = await app.inject({
      method: 'GET',
      url: `/products/${productA.body.id}`,
      headers: { authorization: `Bearer ${businessB.body.apiKey}` },
    });

    const patchB = await app.inject({
      method: 'PATCH',
      url: `/products/${productA.body.id}`,
      headers: { authorization: `Bearer ${businessB.body.apiKey}` },
      payload: { name: 'Hijacked' },
    });

    expect(getB.statusCode).toBe(404);
    expect(patchB.statusCode).toBe(404);
  });
});
