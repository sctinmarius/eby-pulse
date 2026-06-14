import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp, type App } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const BOOTSTRAP = 'test-bootstrap-token-0123456789';

async function createBusiness(app: App, name: string) {
  const res = await app.inject({
    method: 'POST',
    url: '/businesses',
    headers: { 'x-bootstrap-token': BOOTSTRAP },
    payload: { name },
  });
  expect(res.statusCode).toBe(201);
  const body = res.json() as { business: { id: string }; apiKey: string };
  return { id: body.business.id, auth: { authorization: `Bearer ${body.apiKey}` } };
}

describe('tenancy + knowledge API', () => {
  let app: App;

  beforeAll(async () => {
    await prisma.business.deleteMany();
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('rejects business creation without the bootstrap token', async () => {
    const res = await app.inject({ method: 'POST', url: '/businesses', payload: { name: 'Nope' } });
    expect(res.statusCode).toBe(401);
  });

  it('rejects requests without an API key', async () => {
    const res = await app.inject({ method: 'GET', url: '/products' });
    expect(res.statusCode).toBe(401);
  });

  it('returns the API key exactly once and authenticates with it', async () => {
    const a = await createBusiness(app, 'Business A');
    const me = await app.inject({ method: 'GET', url: '/businesses/me', headers: a.auth });
    expect(me.statusCode).toBe(200);
    expect(me.json().name).toBe('Business A');
    expect(me.json().apiKeyHash).toBeUndefined();
  });

  it('creates a product with default settings and validates contentMix on patch', async () => {
    const a = await createBusiness(app, 'Business Mix');
    const created = await app.inject({
      method: 'POST',
      url: '/products',
      headers: a.auth,
      payload: { name: 'My SaaS', slug: 'my-saas' },
    });
    expect(created.statusCode).toBe(201);
    const product = created.json();
    expect(product.settings.contentMix.educational).toBe(40);

    const badPatch = await app.inject({
      method: 'PATCH',
      url: `/products/${product.id}`,
      headers: a.auth,
      payload: {
        settings: { contentMix: { educational: 90, feature: 30, socialProof: 20, offer: 10 } },
      },
    });
    expect(badPatch.statusCode).toBe(400);

    const goodPatch = await app.inject({
      method: 'PATCH',
      url: `/products/${product.id}`,
      headers: a.auth,
      payload: { settings: { postingCadence: 3 } },
    });
    expect(goodPatch.statusCode).toBe(200);
    expect(goodPatch.json().settings.postingCadence).toBe(3);
    expect(goodPatch.json().settings.language).toBe('ro-formal');
  });

  it('upserts and lists knowledge sections', async () => {
    const a = await createBusiness(app, 'Business K');
    const product = (
      await app.inject({
        method: 'POST',
        url: '/products',
        headers: a.auth,
        payload: { name: 'K Product', slug: 'k-product' },
      })
    ).json();

    const put = await app.inject({
      method: 'PUT',
      url: `/products/${product.id}/knowledge/product`,
      headers: a.auth,
      payload: { content: '# What K is\n\nA product.' },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json().title).toBe('What K is');
    expect(put.json().kind).toBe('PRODUCT');

    const imported = await app.inject({
      method: 'POST',
      url: `/products/${product.id}/knowledge/import`,
      headers: a.auth,
      payload: {
        sections: [
          { kind: 'audience', content: '# Who\n\nDoctors.' },
          { kind: 'product', content: '# What K is (v2)\n\nUpdated.' },
        ],
      },
    });
    expect(imported.statusCode).toBe(200);

    const list = await app.inject({
      method: 'GET',
      url: `/products/${product.id}/knowledge`,
      headers: a.auth,
    });
    const sections = list.json() as Array<{ kind: string; title: string }>;
    expect(sections).toHaveLength(2);
    expect(sections.find((section) => section.kind === 'PRODUCT')?.title).toBe('What K is (v2)');
  });

  it('enforces tenant isolation: business B cannot see business A data', async () => {
    const a = await createBusiness(app, 'Business Iso A');
    const b = await createBusiness(app, 'Business Iso B');
    const product = (
      await app.inject({
        method: 'POST',
        url: '/products',
        headers: a.auth,
        payload: { name: 'Secret', slug: 'iso-secret' },
      })
    ).json();

    for (const [method, url] of [
      ['GET', `/products/${product.id}`],
      ['GET', `/products/${product.id}/knowledge`],
      ['PATCH', `/products/${product.id}`],
    ] as const) {
      const res = await app.inject({
        method,
        url,
        headers: b.auth,
        ...(method === 'PATCH' ? { payload: { name: 'Hijack' } } : {}),
      });
      expect(res.statusCode, `${method} ${url}`).toBe(404);
    }

    const listB = await app.inject({ method: 'GET', url: '/products', headers: b.auth });
    expect(listB.json()).toHaveLength(0);
  });
});