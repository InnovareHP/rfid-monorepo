# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## General Principles

- Generate concise, short solutions for new modules or code.
- Watch for over-engineering, oversized files needing refactor.
- Watch for weird syntax/style mismatching rest of codebase.
- Watch for obvious bugs.
- Prioritize concise, precise code and docs changes.
- No emojis or special characters in comments.
- Write activity-log.md in /docs to refer back if confused.
- Make to-do list, run major changes by user first.
- Review existing files before refactor or change.
- Markdown files use kebab naming (e.g. some-description-changes.md).
- Don't auto-commit activity logs and docs.
- Comments: one-liner, one sentence.

## Code Quality

- Right data structures and algorithms for problem.
- Don't expose data needlessly (least privilege).
- No external libraries unless absolutely necessary.
- Use project dependency file for correct versions.
- Avoid redundancy unless it improves usability.

## Version Control

- Commit after significant changes, clear messages.
- Keep commits focused, atomic.
- No auto-push to any branch.
- Work only inside this repo's workspaces: apps/api, apps/fe, apps/web, packages, terraform, docs.

## AI Restrictions

- No customer personal data — names, contacts, account numbers, transactions, unless an approved exemption applies.
- No credentials — passwords, API keys, tokens, connection strings.

## Monorepo Overview

A pnpm workspace monorepo for a multi-tenant business dashboard (lead management, referrals, expenses, analytics). Uses PostgreSQL, Redis, Stripe, and Better Auth.

**Workspaces:**

- `apps/api` — NestJS backend (port 8080). See `apps/api/CLAUDE.md` for detailed backend guidance.
- `apps/fe` — React + Vite frontend (port 3000). See `apps/fe/CLAUDE.md` for detailed frontend guidance.
- `apps/fe-support` — React + Vite frontend (port 3001). See `apps/fe-support/CLAUDE.md` for detailed frontend support guidance.
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

Leads and referrals use an Entity-Attribute-Value pattern for dynamic custom fields per organization. Both share the same tables in `board_schema`, discriminated by `moduleType` (`LEAD` / `REFERRAL`):

- `Field` — field definitions (`fieldName`, `fieldType`, `fieldOrder`, `moduleType`) per org
- `Board` — a record row (a lead or referral), discriminated by `moduleType`
- `FieldValue` — stores the value for each `(record, field)` pair (unique on `recordId, fieldId`)
- EAV rows are reshaped into flat row objects in the service layer (`getAllBoards`) at request time — there is no materialized view
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
- Avoid comments and follow the claude.md of each file
- Toast notifications via `sonner`
- Node >=18 required

## Coding Standards & Separation of Concerns

The codebase is organized so each file has one responsibility. Put new code in the layer that matches its concern — do not mix data fetching, business logic, and presentation in a single file.

### Frontend Folder Structure (`apps/fe/src/`)

Each concern has a dedicated directory. Match the existing layout — do not invent new top-level folders.

```
src/
  routes/        # File-based routes only — thin. Wire data + render a feature component. No business logic.
  components/     # UI. One folder per domain feature (master-list/, analytics/, calendar/, side-bar/).
    ui/           # shadcn/ui primitives only (button, dialog, table). Never put feature logic here.
    reusable-table/  # Cross-feature reusable building blocks shared by multiple domains.
  services/       # API layer. One folder per domain (lead/, referral/, expense/). Axios calls + return typed data. No React.
  hooks/          # Reusable React hooks (use-board-sync.ts, auth-query.ts). Stateful logic shared across components.
  lib/            # Clients + utilities (axios-client, auth-client, permissions, query-client, toast).
    helper/       # App-specific pure helpers.
  types/          # Shared TypeScript types.
```

### Separation of Concerns (the rule)

- **Routes** (`routes/`) stay thin: read params/loaders, call a service or hook, render a feature component. No fetch logic, no formatting, no business rules.
- **Services** (`services/`) own all API access. A component never calls Axios directly — it calls a service function through TanStack Query. Services contain no React and no JSX.
- **Components** (`components/<feature>/`) own presentation and local UI state only. Server state comes from TanStack Query; never duplicate it in `useState`.
- **Hooks** (`hooks/`) own reusable stateful logic. If two components share the same `useQuery`/`useMutation` or effect logic, extract a hook.
- **Utilities** (`lib/`) own pure, side-effect-free functions (formatters, `cn`, permission checks).

### Reusable Components

- Build a reusable component when the same UI pattern appears in two or more features. Place it in a shared location, not inside one feature folder:
  - **Primitive / unstyled-base** → `apps/fe/src/components/ui/` (shadcn) or `packages/ui` for cross-app reuse.
  - **Composite reusable feature blocks** (e.g. tables) → a shared folder like `components/reusable-table/`.
- Feature-specific components stay inside their domain folder (`components/master-list/`). Do not promote to shared until a second consumer exists.
- A component used by **both `apps/fe` and `apps/fe-support`** belongs in `packages/ui`, not duplicated.
- Keep components presentational: pass data and callbacks as props; let the parent route/hook own fetching.

### Utility Separation (local vs. global)

Decide where a utility lives by **who consumes it**:

- **Local utility** — used by one app only → that app's `lib/` (`apps/fe/src/lib/`, `apps/api/src/lib/`).
- **Frontend-only utility** (DOM, lucide-react, papaparse, router) → `apps/fe/src/lib/fe-helpers.ts`. Never put these in `packages/shared` (it builds for NestJS CJS and must stay framework-agnostic).
- **Global / shared utility** — needed by both backend and frontend → `packages/shared`. Must be pure TypeScript with no framework or DOM deps. Run `pnpm build:shared` before consuming from the API.
- Pure functions only in utility files — no React, no API calls, no module-level side effects.

### Backend (`apps/api/src/`)

- `api/<feature>/` holds the NestJS module, controller, and service. Controller = HTTP boundary + validation (DTOs); service = business logic; no Prisma queries in controllers.
- Shared infrastructure (clients, integrations, helpers) lives in `src/lib/`.
- See `apps/api/CLAUDE.md` and `apps/fe/CLAUDE.md` for layer-specific rules.
