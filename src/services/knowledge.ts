import { join } from 'node:path';
import type { KnowledgeKind } from '../generated/prisma/client.js';
import { fileSystemStorage, type TextFileStorage } from '../libs/file-storage.js';
import { prisma } from '../libs/prisma.js';

export const KIND_TO_FILE: Record<KnowledgeKind, string> = {
  PRODUCT: 'product.md',
  AUDIENCE: 'audience.md',
  TONE: 'tone.md',
  EXAMPLES: 'examples.md',
};

export const FILE_TO_KIND: Record<string, KnowledgeKind> = Object.fromEntries(
  Object.entries(KIND_TO_FILE).map(([kind, file]) => [file, kind as KnowledgeKind]),
);

interface KnowledgeSectionInput {
  kind: KnowledgeKind;
  title?: string;
  content: string;
}

export function titleFromMarkdown(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? fallback;
}

export async function listSections(productId: string) {
  return prisma.knowledgeSection.findMany({
    where: { productId },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function upsertSection(productId: string, input: KnowledgeSectionInput) {
  const title = input.title ?? titleFromMarkdown(input.content, input.kind);

  return prisma.knowledgeSection.upsert({
    where: { productId_kind: { productId, kind: input.kind } },
    create: { productId, kind: input.kind, title, content: input.content },
    update: { title, content: input.content },
  });
}

export async function upsertSections(productId: string, sections: KnowledgeSectionInput[]) {
  const results = [];
  for (const section of sections) {
    results.push(await upsertSection(productId, section));
  }
  return results;
}

export async function deleteSection(productId: string, kind: KnowledgeKind) {
  await prisma.knowledgeSection.deleteMany({ where: { productId, kind } });
}

async function readKnowledgeDir(
  dir: string,
  storage: TextFileStorage = fileSystemStorage,
): Promise<KnowledgeSectionInput[]> {
  const files = await storage.listFiles(dir);
  const sections: KnowledgeSectionInput[] = [];

  for (const file of files) {
    const kind = FILE_TO_KIND[file];
    if (!kind) {
      continue;
    }

    sections.push({ kind, content: await storage.readText(join(dir, file)) });
  }

  return sections;
}

export async function importKnowledgeDir(
  productId: string,
  dir: string,
  storage: TextFileStorage = fileSystemStorage,
) {
  const sections = await readKnowledgeDir(dir, storage);

  return upsertSections(productId, sections);
}

export async function exportKnowledgeDir(
  productId: string,
  dir: string,
  storage: TextFileStorage = fileSystemStorage,
) {
  const sections = await listSections(productId);
  await storage.ensureDir(dir);

  for (const section of sections) {
    await storage.writeText(join(dir, KIND_TO_FILE[section.kind]), section.content);
  }

  return sections.length;
}
