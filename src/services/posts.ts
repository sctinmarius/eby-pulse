import type { LlmProvider } from '../agent/llm/provider.js';
import { regenerateWithFeedback } from '../agent/tasks/regenerate-with-feedback.js';
import { ConflictError, NotFoundError } from '../common/error.js';
import type { Post, PostStatus, SignalType } from '../generated/prisma/client.js';
import { runAgentTask } from '../libs/agent-runner.js';
import { modelForTask } from '../libs/llm.js';
import { prisma } from '../libs/prisma.js';
import { buildSystemPrompt } from './generation.js';

interface GenerationMeta {
  topic?: string;
  model?: string;
  history?: { previousContent: string; feedback: string }[];
}

export async function getOwnedPost(postId: string, businessId: string): Promise<Post> {
  const post = await prisma.post.findFirst({ where: { id: postId, product: { businessId } } });
  if (!post) {
    throw new NotFoundError('Post not found');
  }

  return post;
}

function assertPostStatus(post: Post, expected: PostStatus, message: string): void {
  if (post.status !== expected) {
    throw new ConflictError(message);
  }
}

async function transitionPostWithSignal(
  postId: string,
  toStatus: PostStatus,
  signalType: SignalType,
) {
  const [updated] = await prisma.$transaction([
    prisma.post.update({ where: { id: postId }, data: { status: toStatus } }),
    prisma.feedbackSignal.create({ data: { postId, type: signalType } }),
  ]);

  return updated;
}

export async function approvePost(postId: string, businessId: string) {
  const post = await getOwnedPost(postId, businessId);
  assertPostStatus(post, 'PENDING_APPROVAL', 'Post is not pending approval');

  return transitionPostWithSignal(post.id, 'APPROVED', 'APPROVED');
}

export async function skipPost(postId: string, businessId: string) {
  const post = await getOwnedPost(postId, businessId);
  assertPostStatus(post, 'PENDING_APPROVAL', 'Post is not pending approval');

  return transitionPostWithSignal(post.id, 'SKIPPED', 'SKIPPED');
}

export async function markPosted(postId: string, businessId: string) {
  const post = await getOwnedPost(postId, businessId);
  assertPostStatus(post, 'APPROVED', 'Post is not approved');

  return prisma.post.update({ where: { id: post.id }, data: { status: 'POSTED' } });
}

export async function editPost(
  postId: string,
  businessId: string,
  feedback: string,
  llm: LlmProvider,
) {
  const post = await getOwnedPost(postId, businessId);
  assertPostStatus(post, 'PENDING_APPROVAL', 'Post is not pending approval');

  const product = await prisma.product.findUniqueOrThrow({ where: { id: post.productId } });
  const { systemPrompt, settings } = await buildSystemPrompt(product);
  const model = modelForTask('REGENERATE', settings.models?.regenerate);

  const content = await runAgentTask({
    businessId,
    productId: product.id,
    task: 'REGENERATE',
    model,
    run: async () => {
      const result = await regenerateWithFeedback(llm, model, {
        systemPrompt,
        platform: post.platform,
        previousContent: post.content,
        feedback,
      });
      return { result: result.content, usage: result.usage };
    },
  });

  const meta = (post.generationMeta ?? {}) as GenerationMeta;
  const history = [...(meta.history ?? []), { previousContent: post.content, feedback }];

  const [updated] = await prisma.$transaction([
    prisma.post.update({
      where: { id: post.id },
      data: { content, generationMeta: { ...meta, history } },
    }),
    prisma.feedbackSignal.create({
      data: { postId: post.id, type: 'EDITED', payload: { feedback } },
    }),
  ]);

  return updated;
}
