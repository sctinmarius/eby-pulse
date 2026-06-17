import { generateApiKey } from '../src/libs/api-key.js';
import { prisma } from '../src/libs/prisma.js';
import { importKnowledgeDir } from '../src/services/knowledge.js';
import { productSettingsSchema } from '../src/schema/product-settings.js';

async function main() {
  let business = await prisma.business.findFirst({ where: { name: 'Doctor Estimator' } });
  if (!business) {
    const { key, hash } = generateApiKey();
    business = await prisma.business.create({
      data: {
        name: 'Doctor Estimator',
        defaultLanguage: 'ro',
        timezone: 'Europe/Bucharest',
        apiKeyHash: hash,
      },
    });
    // Printed exactly once — only the hash is stored.
    console.log(`Created business "Doctor Estimator". API key (save it now):\n  ${key}`);
  } else {
    console.log('Business "Doctor Estimator" already exists — API key unchanged.');
  }

  const settings = productSettingsSchema.parse({ language: 'ro-formal' });
  const product = await prisma.product.upsert({
    where: { slug: 'doctor-estimator' },
    create: {
      businessId: business.id,
      name: 'Doctor Estimator',
      slug: 'doctor-estimator',
      settings,
    },
    update: {},
  });

  const sections = await importKnowledgeDir(product.id, 'products/doctor-estimator');
  console.log(`Seeded product "${product.slug}" with ${sections.length} knowledge section(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
