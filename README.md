# eby-pulse

AI marketing agent: understands your product, recommends what to post, drafts
social media posts, and learns from your feedback. Multi-tenant from day one.

Design spec and implementation plan live in the Doctor Estimator workspace:
`docs/specs/2026-06-11-eby-pulse-design.md` and
`docs/specs/2026-06-11-eby-pulse-implementation-plan.md`.

## Stack

Fastify 5 · Prisma + PostgreSQL · Vercel AI SDK (Anthropic) · grammY (Telegram) · croner · Vitest

## Development

```bash
cp .env.example .env          # fill BOOTSTRAP_TOKEN + ANTHROPIC_API_KEY
docker compose up -d postgres # postgres on localhost:5433
pnpm install
pnpm prisma:migrate           # apply migrations
pnpm dev                      # http://localhost:3333/health
```

## Tests

```bash
pnpm db:push:test             # sync schema to ebypulse_test
pnpm test
```
