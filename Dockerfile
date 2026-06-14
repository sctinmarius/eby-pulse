FROM node:24-alpine AS base

WORKDIR /app

ARG DATABASE_URL=postgresql://ebypulse:ebypulse@postgres:5432/ebypulse
ENV DATABASE_URL=$DATABASE_URL

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY . .
COPY package.json pnpm-lock.yaml tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY prisma ./prisma

RUN pnpm install --frozen-lockfile
RUN pnpm prisma:generate
RUN pnpm build

# ---
FROM node:24-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY --from=base /app/package.json /app/pnpm-lock.yaml ./
COPY --from=base /app/node_modules ./node_modules
RUN pnpm prune --prod

COPY --from=base /app/prisma.config.ts ./
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/dist ./dist

EXPOSE 3030

CMD ["sh", "-c", "pnpm prisma:migrate && pnpm start:prod"]
