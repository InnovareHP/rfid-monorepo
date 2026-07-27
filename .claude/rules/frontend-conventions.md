# Frontend conventions (apps/fe, apps/fe-support)

```
src/
  routes/            file-based routes, thin
  components/        one folder per domain feature (master-list/, analytics/, calendar/, side-bar/)
    ui/              shadcn primitives only
    reusable-table/  cross-feature building blocks
  services/          one folder per domain (lead/, referral/, expense/)
  hooks/             use-board-sync.ts, auth-query.ts
  lib/               axios-client, auth-client, permissions, query-client, toast
    helper/          app-specific pure helpers
  types/             shared TypeScript types
```

## Layers — do not mix them in one file

- `routes/` — file-based TanStack Router. Thin: read params, call a service or
  hook, render a feature component. No fetch logic, no formatting, no rules.
- `services/<domain>/` — all API access, via `lib/axios-client.ts`. No React,
  no JSX. A component never calls Axios directly.
- `components/<feature>/` — presentation and local UI state only.
  `components/ui/` is shadcn primitives; feature logic never goes there.
- `hooks/` — reusable stateful logic. Two components sharing a query or effect
  means extract a hook.
- `lib/` — pure, side-effect-free helpers (`utils.ts`, `permissions.ts`,
  `fe-helpers.ts`).

Do not invent new top-level folders under `src/`.

## Server state

- TanStack Query owns all server state. Never mirror it into `useState`.
- Mutations use optimistic update in `onMutate`, rollback in `onError`,
  invalidate in `onSuccess`. Never skip invalidation.
- Query keys follow the existing shape: `["leads"]`, `["lead", leadId]`,
  `["lead-history", leadId]`.

## Multi-tenancy and roles

- Org context comes from `useTeamLayoutContext()` in `_team.tsx`
  (user, activeOrganizationId, organizations, memberData, activeSubscription).
- Roles: `owner`, `liason`, `admission_manager`. Gate on `memberData.role` and
  the definitions in `lib/permissions.ts`. Never bypass a role check.
- `_team.tsx` also enforces subscription status — leave that guard intact.

## Board / EAV UI

Leads and referrals share the EAV board tables discriminated by `moduleType`.
Columns are fetched from the API and are always dynamic — never hardcode a
column set. Field types are handled in
`components/reusable-table/editable-cell.tsx`; add new types there, not inline.

## Forms and UI

- `react-hook-form` + `zodResolver`. Do not manage form fields with many
  `useState` values.
- Toasts via `sonner`. Dialogs via the shadcn `Dialog` with an `open` state.
- Tailwind utilities only, no inline styles.
- No new state management libraries.
