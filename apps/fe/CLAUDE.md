# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React + TypeScript dashboard application for managing leads, referrals, and business expenses. Uses TanStack Router for file-based routing, TanStack Query for data fetching, Better Auth for multi-tenant authentication, and shadcn/ui components with Tailwind CSS.

## Commands

### Development
```bash
npm run dev          # Start dev server on port 3000
npm run start        # Start dev server with host access (port 3000)
```

### Production
```bash
npm run build        # Build for production (runs vite build + tsc)
npm run serve        # Preview production build
```

### Testing
```bash
npm run test         # Run all tests with Vitest
```

## Tech Stack

- **Build**: Vite
- **Routing**: TanStack Router (file-based)
- **Data Fetching**: TanStack Query
- **Auth**: Better Auth with organization multi-tenancy
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Forms**: react-hook-form + Zod
- **Testing**: Vitest + @testing-library/react
- **Backend**: NestJS (separate server)

## Architecture

### Authentication & Authorization

- **Better Auth** (`lib/auth-client.ts`) with organization plugin and Stripe integration
- **Roles** defined in `lib/permissions.ts`:
  - `owner`: Full permissions including billing, licenses, admin functions
  - `liason`: Can create and update projects
- **Session loading**: Root route (`__root.tsx`) runs `beforeLoad` to fetch session, making user/session available globally
- **Protected routes**: `_team.tsx` layout guards all team routes, enforces auth + active organization

### Routing Structure

- **File-based routing** via TanStack Router in `src/routes/`
- **Route hierarchy**:
  - `__root.tsx`: Global layout, QueryClientProvider setup
  - `_auth.tsx`: Auth layout (login, register, OTP, password reset)
  - `_team.tsx`: Team layout with sidebar (all team routes require auth)
    - Pattern: `_team/$team/...` where `$team` is the organization ID
    - Provides `TeamLayoutContext` with: user, organizations, memberData, activeSubscription
- **beforeLoad**: Auth checks and data prerequisites
- **Dynamic params**: Use `$param` syntax (e.g., `$team`, `$lead`)

### Data Layer

- **API Client**: `lib/axios-client.ts` - Axios with `withCredentials: true`
- **Services** (in `src/services/`):
  - `lead/lead-service.ts`: Lead CRUD, timeline, history restore, CSV import
  - `referral/referral-service.ts`: Referral operations
  - `expense/`, `mileage/`, `market/`: Expense tracking
  - `analytics/`, `options/`, `image/`, `user/`
- **API Proxy**: Dev server proxies `/api/*` to `VITE_API_URL` environment variable
- **React Query patterns**:
  - Optimistic updates in mutations with rollback on error
  - Aggressive caching for org data (1 hour staleTime) and member data (30 min)
  - Query keys: `["leads"]`, `["lead", leadId]`, `["lead-history", leadId]`
  - Always invalidate relevant queries after mutations

### State Management

- **TeamLayoutContext** (`_team.tsx`):
  - Access via `useTeamLayoutContext()` hook
  - Provides: user, activeOrganizationId, organizations, memberData, activeSubscription
- **Server state**: TanStack Query for all API data
- **Auth state**: Better Auth hooks (`useSession`, `useActiveMember`, `useActiveOrganization`)
- **Local state**: React useState for component-level UI state
- **No Redux or other state libraries**

### UI Components

- **Base components**: shadcn/ui in `src/components/ui/`
- **Feature components**:
  - `master-list/`: Lead management (table, view, filter, column config, analytics)
  - `referral-list/`: Referral management
  - `reusable-table/`: Shared table infrastructure
    - `editable-cell.tsx`: Inline editing for TEXT, DATE, DROPDOWN, STATUS, CHECKBOX, LOCATION, ASSIGNED_TO
    - `generic-table.tsx`: Base table with TanStack Table (sorting, filtering, pagination)
  - `expense-log/`, `mileage-log/`, `market-log/`: Expense tracking features
  - `analytics/`: Dashboard analytics and AI insights

## Key Features & Patterns

### Master List (Leads) & Referral List

- **Dynamic columns**: Fetched from API, frontend adapts
- **Inline cell editing**: Optimistic updates via React Query
- **History tracking**: All changes logged with old → new values
- **Restore functionality**: Can restore UPDATE and DELETE history items
  - `restoreLeadHistory(leadId, historyId, eventType)` in service
  - After restore: invalidate both main data and history queries
- **Notification system**: Bell icon for leads with updates, dismissed via `seenLeads()`
- **AI analysis**: Lead analysis dialog
- **CSV import**: Bulk import leads/referrals
- **Advanced filtering**: Multi-field filter component

### Editable Cells

Field types handled:
- `TEXT`: Inline input
- `DATE`: Date picker calendar
- `DROPDOWN`: Select with option creation
- `STATUS`: Status select (owner role only)
- `CHECKBOX`: Boolean toggle
- `LOCATION`: Google Maps autocomplete
- `ASSIGNED_TO`: User assignment

Pattern for updates:
```typescript
// Optimistic update in mutation onMutate
// Rollback in onError
// Invalidate queries in onSuccess
```

### Role-Based Features

Check role from context:
```typescript
const { memberData } = useTeamLayoutContext()
if (memberData.role === "owner") {
  // Owner-only features (e.g., status editing, history view)
}
```

### Subscription Enforcement

`_team.tsx` layout checks subscription status, redirects to `/billing` if not active/trialing.

## Important Patterns

### Making API Updates

```typescript
// Update field
await updateLead(id, fieldId, value)
// or for referrals
await updateReferral(id, fieldId, value, reason?)

// Always invalidate after mutations
await queryClient.invalidateQueries({ queryKey: ["leads"] })
await queryClient.invalidateQueries({ queryKey: ["lead", leadId] })
```

### Adding Restore Buttons

When adding restore functionality to history views:
1. Import `RotateCcw` icon and `useQueryClient`
2. Add `restoringHistoryId` state for loading indicator
3. Update `handleRestoreHistory` to invalidate queries after restore
4. Conditionally render button only for `action.toLowerCase() === "update"` or `"delete"`
5. Disable all restore buttons when any restore is in progress

### Creating New Dropdown Options

Dropdown fields allow on-the-fly option creation:
```typescript
await createDropdownOption(fieldKey, optionName)
// or for referrals
await createReferralDropdownOption(fieldKey, optionName)
```

## Environment Variables

Required:
- `VITE_API_URL`: Backend API URL (proxied to `/api` in dev server)

## File Organization

- `src/routes/`: File-based routes (TanStack Router auto-generates route tree)
- `src/components/`: UI components (ui/ for shadcn, feature folders for domain logic)
- `src/services/`: API service functions grouped by domain
- `src/lib/`: Core utilities and clients
  - `auth-client.ts`: Better Auth configuration
  - `axios-client.ts`: HTTP client
  - `permissions.ts`: Access control role definitions
  - `types.ts`: Shared TypeScript types
  - `utils.ts`: Utility functions (cn, formatters)
  - `enum.ts`: Shared enums

## Coding Conventions

- Prefer functional components
- Use React Hook Form for forms
- Validate inputs with Zod
- Avoid `any` type
- Prefer early returns
- Use TanStack Query for all server state
- Place tests next to files: `*.test.tsx`
- Dialog components use `open` state + shadcn Dialog
- Toast notifications via `sonner`
- Tailwind CSS utility-first styles
- Avoid inline styles

## Common Patterns

- **Fetching**: Use `useQuery` / `useInfiniteQuery`
- **Mutations**: Use `useMutation` with optimistic updates
- **Forms**: `react-hook-form` + `zodResolver`
- **Modals**: Controlled via component state

## What NOT to Do

- Do not introduce new state management libraries
- Do not bypass role-based access control
- Do not skip query invalidation after mutations
- Do not create static columns (they are dynamic from API)
- Do not use generic "edit" actions without specifying field type
- Do not use many state for form instead use react hook form

## Development Methodology

- **Surgical changes only**: Make minimal, focused fixes
- **Evidence-based debugging**: Add minimal, targeted logging
- **Fix root causes**: Address the underlying issue, not just symptoms
- **Simple > Complex**: Let TypeScript catch errors instead of excessive runtime checks
- **Collaborative process**: Work with user to identify most efficient solution
- **Don't overengineer**: Simple beats complex
- **No fallbacks**: One correct path, no alternatives
- **One way**: One way to do things, not many
- **Clarity over compatibility**: Clear code beats backward compatibility
- **Throw errors**: Fail fast when preconditions aren't met
- **Separation of concerns**: Each function should have a single responsibility
