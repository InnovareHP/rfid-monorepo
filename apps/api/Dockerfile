########################
# Base
########################
FROM node:22-slim AS base
WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

########################
# Dependencies (dev deps for build)
########################
FROM base AS deps

# Build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy monorepo root + package.json of subprojects
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install ALL dependencies including devDependencies (needed for tsc + prisma CLI)
RUN pnpm install --frozen-lockfile --include-dev

########################
# Build Stage
########################
FROM base AS build

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build shared package, generate Prisma client, then build API
RUN pnpm --filter shared build \
 && pnpm --filter api prisma:generate \
 && pnpm --filter api build

########################
# Production
########################
FROM node:22-slim AS production
WORKDIR /app
ENV NODE_ENV=production

# Runtime deps
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

# Copy only files needed for prod install
COPY package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install only prod dependencies
RUN corepack enable \
 && corepack prepare pnpm@latest --activate \
 && pnpm install --prod --frozen-lockfile

# Copy built artifacts and Prisma client
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 8080

# Start API directly with Node (no pnpm needed in prod)
CMD ["node", "apps/api/dist/main.js"]
