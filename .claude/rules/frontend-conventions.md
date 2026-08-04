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

## Forms

Every form uses the shadcn `Form` stack from `@dashboard/ui/components/form`:
`Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`.

- Zod schema first, then `useForm({ resolver: zodResolver(schema) })` typed with
  `z.infer`. The schema is the single source of validation truth.
- Fields render through `FormField` with `control` and `name`. Never wire an
  input to a `useState` value.
- Errors render through `FormMessage`, not a manual error string in state.
- Submit state comes from `form.formState.isSubmitting` or the mutation's
  `isPending`, never a `useState` loading flag.
- Reset and prefill with `defaultValues` or `form.reset(data)`, never a
  `useEffect` that copies props into fields.
- Cross-field logic uses `form.watch` or `superRefine` in the schema, not an
  effect.

## State

- `useState` only for genuine local UI toggles (dialog open, popover, tab).
- `useEffect` only for external subscriptions and imperative DOM. Not for
  fetching, not for syncing derived values.
- Anything derivable is computed during render.

## UI

- Toasts via `sonner`. Dialogs via the shadcn `Dialog` with an `open` state.
- Tailwind utilities only, no inline styles.
- No new state management libraries.
