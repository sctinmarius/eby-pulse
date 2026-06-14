/**
 * Markdown knowledge import/export CLI.
 *
 *   pnpm knowledge:import <dir> --product <slug>
 *   pnpm knowledge:export <dir> --product <slug>
 */
import { parseArgs } from 'node:util';
import { prisma } from '../src/lib/prisma.js';
import { exportKnowledgeDir, importKnowledgeDir } from '../src/services/knowledge.js';

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { product: { type: 'string' } },
  });
  const [command, dir] = positionals;
  if (!command || !dir || !values.product || !['import', 'export'].includes(command)) {
    console.error('Usage: knowledge.ts <import|export> <dir> --product <slug>');
    process.exit(1);
  }

  const product = await prisma.product.findUnique({ where: { slug: values.product } });
  if (!product) {
    console.error(`Product with slug "${values.product}" not found`);
    process.exit(1);
  }

  if (command === 'import') {
    const sections = await importKnowledgeDir(product.id, dir);
    console.log(`Imported ${sections.length} section(s) into "${product.slug}" from ${dir}`);
  } else {
    const count = await exportKnowledgeDir(product.id, dir);
    console.log(`Exported ${count} section(s) from "${product.slug}" to ${dir}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
