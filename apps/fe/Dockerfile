FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY apps/fe/package.json ./apps/fe/

RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /app/apps/fe/node_modules ./apps/fe/node_modules

COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/ ./packages/shared/
COPY packages/ui/ ./packages/ui/
COPY apps/fe/ ./apps/fe/

# Build shared (required dependency), then vite build only (skip tsc)
RUN pnpm --filter @dashboard/shared build \
    && cd apps/fe && npx vite build

FROM node:22-slim AS production
RUN npm i -g serve@latest

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodejs

COPY --from=build --chown=nodejs:nodejs /app/apps/fe/dist ./dist

USER nodejs

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
