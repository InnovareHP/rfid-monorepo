# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Overview

A pnpm workspace monorepo for a multi-tenant business dashboard (lead management, referrals, expenses, analytics). Uses PostgreSQL, Redis, Stripe, and Better Auth.

**Workspaces:**
- `apps/api` — NestJS backend (port 8080). See `apps/api/CLAUDE.md` for detailed backend guidance.
- `apps/fe` — React + Vite frontend (port 3000). See `apps/fe/CLAUDE.md` for detailed frontend guidance.
- `packages/ui` — Shared Radix UI + Tailwind component library
- `packages/shared` — Shared utilities

## Commands

All commands run from the monorepo root using **pnpm** (not npm/yarn).

```bash
# Install dependencies
pnpm install

# Development
pnpm dev              # Start all apps in parallel
pnpm dev:fe           # Frontend only
pnpm dev:api          # Backend only

# Build
pnpm build            # Build all
pnpm build:fe         # Frontend only
pnpm build:api        # Backend only

# Test
pnpm test             # Run all tests
pnpm test:fe          # Frontend tests only (Vitest)

# Lint
pnpm lint             # Lint all packages

# Database (Prisma — delegates to apps/api)
pnpm prisma:generate  # Regenerate Prisma client after schema changes
pnpm prisma:migrate   # Create and apply migrations
pnpm prisma:studio    # Open database GUI
```

To run a single frontend test file:
```bash
pnpm --filter fe exec vitest run path/to/file.test.tsx
```

## Architecture

### Tech Stack
- **Backend**: NestJS 11, Prisma ORM (multi-schema PostgreSQL), Better Auth, Stripe, Redis, Resend email, Google Gemini AI
- **Frontend**: React 19, Vite, TanStack Router (file-based), TanStack Query, TanStack Table, shadcn/ui, Tailwind CSS v4, react-hook-form + Zod
- **Auth**: Better Auth with organization plugin — custom table/field names (e.g., `user_table.user_id`, not `users.id`)

### Multi-Tenant Design
Organization-based tenancy. Every authenticated request carries `activeOrganizationId`, `memberId`, and `memberRole` in the session. Roles: `owner`, `liason`, `admission_manager`.

### Lead Management (EAV Pattern)
Leads use an Entity-Attribute-Value pattern for dynamic custom fields per organization:
- `LeadField` — field definitions (name, type, order) per org
- `LeadValue` — stores values for each lead-field pair
- `LeadFlatView` — materialized view for efficient querying
- Columns are dynamic (fetched from API), never hardcoded on the frontend

### Database Schema Organization
Prisma models are split across `apps/api/prisma/models/*.prisma` (not a single schema file). Schemas: `auth_schema`, `lead_schema`, `stripe_schema`, `referral_schema`, `liason_schema`, `public_schema`.

After any schema change: run `pnpm prisma:generate`, then `pnpm prisma:migrate`. If auth tables change, also run `pnpm --filter api auth:generate`.

### Frontend Routing
File-based routing in `apps/fe/src/routes/`:
- `__root.tsx` — root layout, QueryClientProvider
- `_auth.tsx` — auth layout (login, register, OTP, password reset)
- `_team.tsx` — team layout guard; provides `TeamLayoutContext` (user, org, role, subscription)
- `_team/$team/...` — all organization-scoped routes (`$team` = org ID)

### Data Flow
- Frontend proxies `/api/*` to `VITE_API_URL` in dev
- Backend global prefix: `/api`, Swagger docs at `/api/docs`
- All API calls use Axios with `withCredentials: true`
- Server state managed exclusively through TanStack Query with optimistic updates
- Always invalidate relevant query keys after mutations

### Environment Variables
- **Backend**: `.env` from `.env.example` — requires `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `CLOUDINARY_*`, `WEBSITE_URL`
- **Frontend**: `VITE_API_URL` (backend URL)

## Key Conventions

- Config accessed via `appConfig` export (Zod-validated), not NestJS ConfigService
- Prisma client is a singleton from `apps/api/src/lib/prisma/prisma.ts`
- No Redux or other state libraries — TanStack Query for server state, React context/useState for UI state
- shadcn/ui components live in `apps/fe/src/components/ui/`; feature components in domain folders
- Tests colocated next to source files as `*.test.tsx`
- Toast notifications via `sonner`
- Node >=18 required
