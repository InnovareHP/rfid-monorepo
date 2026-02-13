# Final production stage
FROM node:22-slim AS production
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install serve (tiny, fast, production-tested)
RUN pnpm add -g serve@latest

WORKDIR /app

# Copy built assets
COPY --from=build /app/apps/fe/dist ./dist

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodejs && \
    chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

# SPA routing handled automatically by serve
CMD ["serve", "-s", "dist", "-l", "3000", "--no-request-logging"]