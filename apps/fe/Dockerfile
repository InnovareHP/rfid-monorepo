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

# Vite statically replaces import.meta.env.VITE_* at build time, so these
# have to be real env vars before vite build runs, not just runtime env.
ARG VITE_API_URL
ARG VITE_AWS_REGION
ARG VITE_AWS_LOCATION_API_KEY
ENV VITE_API_URL=$VITE_API_URL \
    VITE_AWS_REGION=$VITE_AWS_REGION \
    VITE_AWS_LOCATION_API_KEY=$VITE_AWS_LOCATION_API_KEY

# Build shared (required dependency), then vite build only (skip tsc)
RUN pnpm --filter @dashboard/shared build \
    && cd apps/fe && npx vite build

FROM base AS production
WORKDIR /app

COPY --from=build /app/ ./

EXPOSE 3000
CMD ["pnpm", "--filter", "fe", "start"]
