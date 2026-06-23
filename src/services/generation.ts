import { assembleSystemPrompt } from '../agent/prompt-assembler.js';
import type { LlmProvider } from '../agent/llm/provider.js';
import { generatePosts } from '../agent/tasks/generate-posts.js';
import type { Platform, Product } from '../generated/prisma/client.js';
import { runAgentTask } from '../libs/agent-runner.js';
import { modelForTask } from '../libs/llm.js';
import { prisma } from '../libs/prisma.js';
import { productSettingsSchema, type ProductSettings } from '../schema/product-settings.js';
import { listSections } from './knowledge.js';

export interface GenerateDraftsInput {
  draftCount?: number;
  platforms?: Platform[];
  topic?: string;
}

const RECENT_TOPICS_LIMIT = 15;

export function resolvePlatforms(
  draftCount: number,
  override: Platform[] | undefined,
  configuredPlatforms: Platform[],
): Platform[] {
  const pool = override && override.length > 0 ? override : configuredPlatforms;

  return Array.from({ length: draftCount }, (_, index) => pool[index % pool.length] as Platform);
}

export function distributeSchedule(draftCount: number, startDate: Date): Date[] {
  return Array.from({ length: draftCount }, (_, index) => {
    const dayOffset = Math.floor((index * 7) / draftCount);
    const date = new Date(startDate);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    return date;
  });
}

function tomorrowAt8am(): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  date.setUTCHours(8, 0, 0, 0);
  return date;
}

async function getRecentPostTopics(productId: string, limit: number): Promise<string[]> {
  const posts = await prisma.post.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { generationMeta: true },
  });

  return posts
    .map((post) => (post.generationMeta as { topic?: string } | null)?.topic)
    .filter((topic): topic is string => Boolean(topic));
}

export async function buildSystemPrompt(
  product: Product,
): Promise<{ systemPrompt: string; settings: ProductSettings }> {
  const settings = productSettingsSchema.parse(product.settings);

  const [knowledgeSections, activeLearnings, recentPostTopics] = await Promise.all([
    listSections(product.id),
    prisma.learning.findMany({ where: { productId: product.id, status: 'ACTIVE' } }),
    getRecentPostTopics(product.id, RECENT_TOPICS_LIMIT),
  ]);

  const systemPrompt = assembleSystemPrompt({
    knowledgeSections: knowledgeSections.map((section) => ({
      kind: section.kind,
      title: section.title,
      content: section.content,
    })),
    activeLearnings: activeLearnings.map((learning) => ({
      category: learning.category,
      content: learning.content,
    })),
    recentPostTopics,
    settings,
  });

  return { systemPrompt, settings };
}

export async function generateDrafts(
  product: Product,
  input: GenerateDraftsInput,
  llm: LlmProvider,
) {
  const { systemPrompt, settings } = await buildSystemPrompt(product);
  const draftCount =
    input.draftCount ?? input.platforms?.length ?? (input.topic ? 1 : settings.postsPerWeek);
  const platforms = resolvePlatforms(draftCount, input.platforms, settings.platforms);
  const model = modelForTask('GENERATE', settings.models?.generate);

  const drafts = await runAgentTask({
    businessId: product.businessId,
    productId: product.id,
    task: 'GENERATE',
    model,
    run: async () => {
      const { posts, usage } = await generatePosts(llm, model, {
        systemPrompt,
        count: draftCount,
        platforms,
        topic: input.topic,
      });
      return { result: posts, usage };
    },
  });

  const schedule = distributeSchedule(draftCount, tomorrowAt8am());

  return prisma.$transaction(
    drafts.map((draft, index) =>
      prisma.post.create({
        data: {
          productId: product.id,
          platform: draft.platform,
          content: draft.content,
          status: 'PENDING_APPROVAL',
          scheduledFor: schedule[index],
          generationMeta: { topic: draft.topic, model },
        },
      }),
    ),
  );
}
