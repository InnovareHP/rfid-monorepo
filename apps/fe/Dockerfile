# 1. Base Layer
FROM node:22-slim AS base
ENV CI=true
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# 2. Dependencies Layer
FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY apps/fe/package.json ./apps/fe/

RUN pnpm install --frozen-lockfile

# 3. Build Layer
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /app/apps/fe/node_modules ./apps/fe/node_modules

COPY packages/shared/ ./packages/shared/
COPY packages/ui/ ./packages/ui/
COPY apps/fe/ ./apps/fe/

# Build in order
RUN pnpm --filter @dashboard/shared build \
    && pnpm --filter @dashboard/ui build \
    && pnpm --filter fe build

# 4. Production Stage with serve
FROM node:22-slim AS production
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install serve globally
RUN pnpm add -g serve@latest

WORKDIR /app

# Copy built assets from build stage
COPY --from=build /app/apps/fe/dist ./dist

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodejs && \
    chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

# Serve static files with SPA fallback
CMD ["serve", "-s", "dist", "-l", "3000", "--no-request-logging"]