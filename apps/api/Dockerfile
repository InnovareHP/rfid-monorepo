FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

# Optimize: Copy all package.json files in one layer
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/tsconfig.json apps/api/tsconfig.build.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile

FROM base AS build
# Optimize: Remove openssl install - already in deps stage, not needed here
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

RUN pnpm --filter shared build \
    && pnpm --filter api prisma:generate \
    && pnpm --filter api build

FROM node:22-slim AS production
# Optimize: Combine apt-get commands and cleanup
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Optimize: Copy all config files in one layer
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json apps/api/tsconfig.json apps/api/tsconfig.build.json ./apps/api/

# Optimize: Copy only production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Prisma schema + generate
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
RUN cd apps/api && npx prisma generate --schema=./prisma

# Built artifacts - only what's needed for production
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

# Optimize: Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

EXPOSE 8080
CMD ["pnpm", "start:prod"]