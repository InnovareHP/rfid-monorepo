FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY apps/landing/package.json ./apps/landing/

RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules
COPY --from=deps /app/apps/landing/node_modules ./apps/landing/node_modules

COPY package.json pnpm-workspace.yaml ./
COPY packages/ui/ ./packages/ui/
COPY apps/landing/ ./apps/landing/

RUN cd apps/landing && npx astro build

FROM nginx:alpine AS production
COPY apps/landing/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/landing/dist /usr/share/nginx/html

EXPOSE 3002
CMD ["nginx", "-g", "daemon off;"]
