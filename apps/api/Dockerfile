# 1. Base Layer
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# CI=true solves the "No TTY" error for pnpm
ENV CI=true 
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# 2. Dependency Layer
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# 3. Build Layer
FROM deps AS build
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

RUN pnpm --filter @dashboard/shared build \
    && pnpm --filter api prisma:generate \
    && pnpm --filter api build

# 4. Production Runner
FROM node:22-slim AS production
WORKDIR /app
ENV NODE_ENV=production
ENV CI=true

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy built files
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Re-install ONLY production dependencies
# This is much cleaner than 'prune' in a monorepo
RUN corepack enable && corepack prepare pnpm@latest --activate \
    && pnpm install --prod --frozen-lockfile

EXPOSE 8080
CMD ["node", "apps/api/dist/main.js"]