FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/fe/package.json ./apps/fe/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/fe/node_modules ./apps/fe/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules 2>/dev/null || true
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/ui/ ./packages/ui/
COPY apps/fe/ ./apps/fe/

RUN pnpm --filter fe build

# Serve with nginx
FROM nginx:alpine AS production
COPY --from=build /app/apps/fe/dist /usr/share/nginx/html
COPY apps/fe/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
