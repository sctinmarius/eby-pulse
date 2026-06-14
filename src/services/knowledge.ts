import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { KnowledgeKind } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';
import { FILE_TO_KIND, KIND_TO_FILE, titleFromMarkdown } from './knowledge-markdown.js';

export interface KnowledgeSectionInput {
  kind: KnowledgeKind;
  title?: string;
  content: string;
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

async function readKnowledgeDir(dir: string): Promise<KnowledgeSectionInput[]> {
  const files = await readdir(dir);
  const sections: KnowledgeSectionInput[] = [];

  for (const file of files) {
    const kind = FILE_TO_KIND[file];
    if (!kind) continue;
    sections.push({ kind, content: await readFile(join(dir, file), 'utf8') });
  }

  return sections;
}

export async function importKnowledgeDir(productId: string, dir: string) {
  const sections = await readKnowledgeDir(dir);
  return upsertSections(productId, sections);
}

export async function exportKnowledgeDir(productId: string, dir: string) {
  const sections = await listSections(productId);
  await mkdir(dir, { recursive: true });

  for (const section of sections) {
    await writeFile(join(dir, KIND_TO_FILE[section.kind]), section.content, 'utf8');
  }

  return sections.length;
}