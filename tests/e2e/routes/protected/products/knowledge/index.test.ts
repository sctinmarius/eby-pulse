import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { App } from '../../../../../../src/app.js';
import {
  closeTestApp,
  createBusiness,
  createProduct,
  createTestApp,
  resetDatabase,
} from '../../../../support.js';

describe('protected /products/:productId/knowledge routes', () => {
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

  it('upserts, imports, lists, and deletes knowledge sections', async () => {
    const owner = await createBusiness(app, { name: 'Knowledge Clinic' });
    const auth = { authorization: `Bearer ${owner.body.apiKey}` };
    const product = await createProduct(app, auth, {
      name: 'Doctor Estimator',
      slug: 'doctor-estimator',
    });

    const put = await app.inject({
      method: 'PUT',
      url: `/products/${product.body.id}/knowledge/product`,
      headers: auth,
      payload: { content: '# Doctor Estimator\n\nRevenue tracking for collaborating doctors.' },
    });

    expect(put.statusCode).toBe(200);
    expect(put.json()).toMatchObject({
      kind: 'PRODUCT',
      title: 'Doctor Estimator',
    });

    const imported = await app.inject({
      method: 'POST',
      url: `/products/${product.body.id}/knowledge/import`,
      headers: auth,
      payload: {
        sections: [
          { kind: 'audience', content: '# Audience\n\nRomanian collaborating doctors.' },
          { kind: 'tone', content: '# Tone\n\nFormal, precise, and value-driven.' },
          {
            kind: 'examples',
            content: '# Examples\n\nShow visibility into procedures and income.',
          },
          {
            kind: 'product',
            content: '# Doctor Estimator Updated\n\nUnified calendar and revenue clarity.',
          },
        ],
      },
    });

    expect(imported.statusCode).toBe(200);
    expect(imported.json()).toHaveLength(4);

    const listed = await app.inject({
      method: 'GET',
      url: `/products/${product.body.id}/knowledge`,
      headers: auth,
    });

    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toHaveLength(4);
    expect(
      listed
        .json()
        .map((section: { kind: string }) => section.kind)
        .sort(),
    ).toEqual(['AUDIENCE', 'EXAMPLES', 'PRODUCT', 'TONE']);
    expect(
      listed.json().find((section: { kind: string; title: string }) => section.kind === 'PRODUCT')
        ?.title,
    ).toBe('Doctor Estimator Updated');

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/products/${product.body.id}/knowledge/examples`,
      headers: auth,
    });

    expect(deleted.statusCode).toBe(204);

    const afterDelete = await app.inject({
      method: 'GET',
      url: `/products/${product.body.id}/knowledge`,
      headers: auth,
    });

    expect(afterDelete.statusCode).toBe(200);
    expect(afterDelete.json()).toHaveLength(3);
    expect(
      afterDelete.json().find((section: { kind: string }) => section.kind === 'EXAMPLES'),
    ).toBeUndefined();
  });

  it('rejects invalid knowledge kinds', async () => {
    const owner = await createBusiness(app, { name: 'Validation Knowledge Clinic' });
    const auth = { authorization: `Bearer ${owner.body.apiKey}` };
    const product = await createProduct(app, auth, {
      name: 'Validation Product',
      slug: 'validation-product',
    });

    const invalidKind = await app.inject({
      method: 'PUT',
      url: `/products/${product.body.id}/knowledge/not-a-kind`,
      headers: auth,
      payload: { content: '# invalid' },
    });

    expect(invalidKind.statusCode).toBe(400);
  });

  it('keeps knowledge access scoped to the owning business', async () => {
    const businessA = await createBusiness(app, { name: 'Business A' });
    const businessB = await createBusiness(app, { name: 'Business B' });

    const productA = await createProduct(
      app,
      { authorization: `Bearer ${businessA.body.apiKey}` },
      { name: 'Secret Product', slug: 'secret-product' },
    );

    const createdKnowledge = await app.inject({
      method: 'PUT',
      url: `/products/${productA.body.id}/knowledge/product`,
      headers: { authorization: `Bearer ${businessA.body.apiKey}` },
      payload: { content: '# Secret Product\n\nInternal positioning.' },
    });

    expect(createdKnowledge.statusCode).toBe(200);

    const getB = await app.inject({
      method: 'GET',
      url: `/products/${productA.body.id}/knowledge`,
      headers: { authorization: `Bearer ${businessB.body.apiKey}` },
    });

    const deleteB = await app.inject({
      method: 'DELETE',
      url: `/products/${productA.body.id}/knowledge/product`,
      headers: { authorization: `Bearer ${businessB.body.apiKey}` },
    });

    expect(getB.statusCode).toBe(404);
    expect(deleteB.statusCode).toBe(404);
  });
});
