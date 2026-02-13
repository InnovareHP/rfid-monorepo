# 1. Base Layer
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# 2. Dependency Layer (Heavy dependencies installed once)
FROM base AS deps
# Install build tools only once
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace configs
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# Selective copy for package.json files to cache 'pnpm install'
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# 3. Build Layer
FROM deps AS build
# Copy source code (Now that dependencies are cached)
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

# Build shared first, then API
RUN pnpm --filter @dashboard/shared build \
    && pnpm --filter api prisma:generate \
    && pnpm --filter api build \
    # Remove devDependencies to save space before final copy
    && pnpm prune --prod --no-optional

# 4. Production Runner (Minimalist)
FROM node:22-slim AS production
WORKDIR /app
ENV NODE_ENV=production

# Only install runtime essentials
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy built files and production node_modules from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
# Root package.json/workspace files required for pnpm start
COPY pnpm-workspace.yaml package.json ./

EXPOSE 8080
# Use pnpm filter to run exactly the API start command
CMD ["node", "apps/api/dist/main.js"]