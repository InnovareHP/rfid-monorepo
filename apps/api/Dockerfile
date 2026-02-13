########################
# Base
########################
FROM node:22-slim AS base
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate


########################
# Dependencies
########################
FROM base AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile


########################
# Build
########################
FROM base AS build

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm --filter shared build \
 && pnpm --filter api prisma:generate \
 && pnpm --filter api build


########################
# Production
########################
# Production
FROM node:22-slim AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*

# Copy package.json only for prod deps
COPY package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install only prod dependencies
RUN corepack enable \
 && corepack prepare pnpm@latest --activate \
 && pnpm install --prod --frozen-lockfile

# Copy build artifacts
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma

EXPOSE 8080

# Use Node directly instead of pnpm in prod
CMD ["node", "apps/api/dist/main.js"]

