# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`fe-support` is the customer-facing support portal frontend (port 3001). It is a separate app from the main dashboard (`apps/fe`, port 3000) within the same monorepo. It provides a knowledge base, AI chat assistant, support ticket submission, and a "My Requests" ticket tracker.

## Commands

Run from the **monorepo root** using pnpm:

```bash
pnpm --filter fe-support dev        # Dev server on port 3001
pnpm --filter fe-support build      # Vite build + tsc
pnpm --filter fe-support test       # Vitest run
```

Before running the dev server, ensure shared packages are built if backend is involved:
```bash
pnpm build:shared
```

## Tech Stack

- React 19, Vite, TanStack Router (file-based, auto code-splitting), TanStack Query
- Tailwind CSS v4, shadcn/ui via `@dashboard/ui` workspace package
- Better Auth client (`src/lib/auth-client.ts`) — session via `useSession()`, not route-level guards
- Axios with `withCredentials: true` (`src/lib/axios-client.ts`)
- react-hook-form + Zod for forms
- Deployed to Railway, Dockerized (port 3001)

## Architecture

### Routing

File-based routing in `src/routes/` (TanStack Router):

- `/` — redirects to `/en/` (default language)
- `/_lang/$lang/` — support portal home (knowledge base + AI chat)
- `/_lang/$lang/account` — user account page
- `/_lang/$lang/dashboard` — support dashboard (sidebar layout)
- `/_lang/$lang/request` — "My Requests" ticket list
- `/admin` — admin dashboard (pathless layout `_admin`, sidebar layout)
- `/support/$id` — individual support detail (standalone, no layout)
- `/_support/support/ticket` — stub route (in progress)

**Conventions:**
- **Pathless layout:** `_name.tsx` (e.g. `_lang`, `_admin`) — layout does not add a URL segment; children define the path.
- **Dynamic segment:** `$param` in file/folder name (e.g. `$lang`, `$ticketNumber`).
- **Segment + page:** use a single file for one route (e.g. `_lang/$lang/dashboard.tsx`, `_admin/admin.tsx`) instead of a folder with `index.tsx` when there is only one page for that segment.
- **Nested routes:** use a folder with `index.tsx` when the segment has sub-routes (e.g. `request/index.tsx`, `request/$ticketNumber/index.tsx`).

The `_lang` layout wraps pages in `SupportLayout`. The `_admin` layout wraps pages in `AdminLayout` (sidebar). The root route provides `QueryClientProvider` and `Toaster`.

### Key Components

- **SupportLayout** (`src/components/SupportLayout/`) — shared header/footer shell with auth-aware nav (login vs user dropdown)
- **SupportPortalPage** (`src/components/SupportPortalPage/`) — home page: knowledge base grid + resource links + lazy-loaded `SupportChat`
- **SupportChat** (`src/components/SupportChat/`) — AI assistant chat widget with inline/enlarged overlay modes; includes `AssistanceForm` for ticket creation and `ImageDropper` for attachments
- **RequestsPage** (`src/components/RequestsPage/`) — paginated ticket list with search/status filters, uses `ReusableTable`
- **ReusableTable** (`src/components/ReusableTable/`) — generic table with pagination, loading, and empty states
- **Dashboard** (`src/components/Dashboard/`) — sidebar-based support dashboard layout (uses `SidebarProvider` from `@dashboard/ui`)
- **AdminDashboard** (`src/components/AdminDashboard/`) — admin layout, sidebar, and dashboard page for `/admin`

### Services

- `src/services/support/support-service.ts` — CRUD for support tickets (`/api/support/tickets`)
- `src/services/image/image-service.ts` — image upload/delete (`/api/image/`)

### Shared Dependencies

- `@dashboard/shared` — types (`SupportTicket`, `TicketRow`, `TicketStatus`, `ChatMessage`), constants (knowledge base items, footer links, language options), helpers
- `@dashboard/ui` — all UI components (button, card, form, sidebar, table, etc.) imported as `@dashboard/ui/components/<name>`
- `KNOWLEDGE_BASE_ICON_MAP` in `src/lib/contant.ts` maps icon keys from shared constants to lucide-react components (frontend-only, since lucide-react can't go in shared)

### Environment Variables

- `VITE_API_URL` — backend API URL (proxied via Vite dev server at `/api`)
- `VITE_DASHBOARD_URL` — main dashboard URL (used for login redirect link)

## Conventions

- Path alias: `@/` maps to `./src/`
- `Vite optimizeDeps.exclude: ['@dashboard/ui']` — source-level sharing, no pre-bundling
- Tailwind `@source "../../../packages/ui/src"` in `index.css` — ensures UI package classes are scanned
- Auth is lazy: root route does NOT block on session; components call `useSession()` individually
- `SupportChat` is lazy-loaded via `React.lazy()` to avoid blocking initial paint
- Toast notifications via `sonner` (Toaster in root layout)
