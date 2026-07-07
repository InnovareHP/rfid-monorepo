# syntax=docker/dockerfile:1.7
# Build context = repo root: `docker build -f apps/landing/Dockerfile .`
#
# Astro is configured without an SSR adapter, so this produces a static
# build and serves it via `serve`. To switch to SSR, add @astrojs/node and
# change CMD to `node ./dist/server/entry.mjs`.

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm" PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/landing/package.json apps/landing/
COPY packages/ui/package.json packages/ui/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

FROM base AS build
COPY --from=deps /repo /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY apps/landing/ apps/landing/

RUN pnpm --filter landing run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache tini && \
    addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 astro

# Astro static output → /repo/apps/landing/dist/
COPY --from=build --chown=astro:nodejs /repo/apps/landing/dist ./dist

# Tiny static file server (no extra image layers needed beyond npx).
RUN npm install -g serve@14

USER astro
ENV PORT=3002
EXPOSE 3002

ENTRYPOINT ["/sbin/tini", "--"]
# NOT `-s`/`--single`: this is a multi-page static site (each route is its own
# dist/<route>/index.html). Single-page mode rewrites every path to the root
# index.html, so sub-routes would all render the homepage. Plain `serve` does
# clean-URL + directory-index resolution.
# Shell form so Railway's injected PORT is respected at runtime.
CMD ["sh", "-c", "serve dist -l ${PORT:-3002} --no-clipboard"]
