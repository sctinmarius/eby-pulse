FROM node:24-alpine AS base

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

COPY . .
# prisma.config.ts resolves DATABASE_URL eagerly; generate never connects,
# so a placeholder is enough at build time (runtime env overrides it).
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN pnpm prisma:generate && pnpm build

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

EXPOSE 3333

CMD ["sh", "-c", "pnpm prisma:migrate:deploy && pnpm start:docker"]
