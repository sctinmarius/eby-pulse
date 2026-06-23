import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { bearerSecurity } from '../../../common/constant.js';
import { postIdParams } from '../../../schema/shared.js';
import { approvePost, editPost, markPosted, skipPost } from '../../../services/posts.js';

const postsRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/posts/:postId/approve',
    {
      schema: {
        tags: ['Posts (Step 5)'],
        summary: 'Approve a pending post',
        description:
          'Moves a `PENDING_APPROVAL` post to `APPROVED` and records an `APPROVED` feedback signal. Only valid from `PENDING_APPROVAL` — returns 409 otherwise.',
        security: bearerSecurity,
        params: postIdParams,
      },
    },
    async ({ params, business }) => approvePost(params.postId, business.id),
  );

  app.post(
    '/posts/:postId/skip',
    {
      schema: {
        tags: ['Posts (Step 5)'],
        summary: 'Skip a pending post',
        description:
          'Moves a `PENDING_APPROVAL` post to `SKIPPED` and records a `SKIPPED` feedback signal — use this when a draft is not worth fixing. Only valid from `PENDING_APPROVAL` — returns 409 otherwise.',
        security: bearerSecurity,
        params: postIdParams,
      },
    },
    async ({ params, business }) => skipPost(params.postId, business.id),
  );

  app.post(
    '/posts/:postId/mark-posted',
    {
      schema: {
        tags: ['Posts (Step 5)'],
        summary: 'Mark an approved post as posted',
        description:
          'Moves an `APPROVED` post to `POSTED`, once you have actually copy-pasted it to Facebook/Instagram. Only valid from `APPROVED` — returns 409 otherwise (e.g. for a still-pending post).',
        security: bearerSecurity,
        params: postIdParams,
      },
    },
    async ({ params, business }) => markPosted(params.postId, business.id),
  );

  app.post(
    '/posts/:postId/edit',
    {
      schema: {
        tags: ['Posts (Step 5)'],
        summary: 'Regenerate a post from feedback',
        description:
          'Re-runs the agent on a `PENDING_APPROVAL` post with your free-text feedback (e.g. "mai formal, scoateți emoji-ul"), replacing its content while staying `PENDING_APPROVAL`. The previous content and feedback are kept in `generationMeta.history`, and an `EDITED` feedback signal is recorded. Only valid from `PENDING_APPROVAL` — returns 409 otherwise. Returns 402 if the business has hit its monthly spend cap (see `PATCH /businesses/me`).',
        security: bearerSecurity,
        params: postIdParams,
        body: z
          .object({ feedback: z.string().min(1) })
          .meta({ example: { feedback: 'Faceți tonul mai formal și scoateți emoji-ul.' } }),
      },
    },
    async ({ params, body, business, server }) =>
      editPost(params.postId, business.id, body.feedback, server.llmProvider),
  );
};

export default postsRoutes;
