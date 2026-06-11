import type { KnowledgeKind } from '../../generated/prisma/client.js';

export const KIND_TO_FILE: Record<KnowledgeKind, string> = {
  PRODUCT: 'product.md',
  AUDIENCE: 'audience.md',
  TONE: 'tone.md',
  EXAMPLES: 'examples.md',
};

export const FILE_TO_KIND: Record<string, KnowledgeKind> = Object.fromEntries(
  Object.entries(KIND_TO_FILE).map(([kind, file]) => [file, kind as KnowledgeKind]),
);

export const KNOWLEDGE_KINDS = Object.keys(KIND_TO_FILE) as KnowledgeKind[];

/** First `# heading` of the document, or the fallback when there is none. */
export function titleFromMarkdown(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? fallback;
}
