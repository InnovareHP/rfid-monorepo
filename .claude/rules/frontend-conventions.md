# Frontend conventions (apps/fe, apps/fe-support)

These apply to the lines you write or change, not to every line of a file you
happened to touch. Pre-existing violations are tracked as cleanup, not blockers
— do not fix them inside an unrelated change, and say what you left behind.

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
- No new state management libraries.

## Styling

Tailwind v4. Tokens are the only source of color. Each app declares its own in
`:root`, `.dark`, and `@theme inline`:

- `apps/fe/src/styles.css`
- `apps/fe-support/src/index.css`
- `apps/landing/src/styles/global.css`

### Color

- No hex literal in JSX. `bg-[#0d3185]` is `bg-brand`, `bg-[#f4f9ff]` is
  `bg-table-header`. If no token matches, add one to `styles.css` — never
  inline the hex.
- No raw Tailwind palette color. It does not follow `.dark`, so every one is a
  dark-mode bug. Use the semantic token:

  | Raw | Token |
  | --- | --- |
  | `text-gray-500`, `text-gray-600` | `text-muted-foreground` |
  | `text-gray-900`, `text-black` | `text-foreground` |
  | `bg-white` | `bg-background` or `bg-card` |
  | `bg-gray-50`, `bg-gray-100` | `bg-muted` |
  | `border-gray-200` | `border-border` |
  | `text-red-600`, `bg-red-50` | `text-destructive`, `bg-destructive/10` |
  | chart series | `chart-1..5`, `chart-seq-1..4` |

- Need a state color the tokens do not cover (success, warning, info)? Add the
  variable to both `:root` and `.dark`, map it under `@theme`, then use the
  utility. Do not reach for `green-100`.
- Two exceptions, both of which must live in exactly one place and say why:
  third-party brand colors (Google red, Outlook blue), and a decorative brand
  surface that is artwork rather than themed UI (see `auth-panel.tsx`). Neither
  may be scattered across JSX.
- A theme-independent background needs a theme-independent foreground. Pairing a
  fixed color with `text-primary-foreground` inverts it in dark mode.
- A token used as small text on a `/10` tint of itself sits around
  `oklch(0.48)` in the light theme. Lighter than that fails AA.
- Do not thin small text with an opacity modifier to show hierarchy. Keep the
  text solid and vary the background.
- Do not add a token until something uses it.

### Tokens crossing into packages/ui

A component in `packages/ui` may only use tokens that **every** consuming app
defines. `Button`, `Badge`, and the rest render in all three.

- Adding a token that `packages/ui` will reference means adding it to all three
  stylesheets in the same change — `:root`, `.dark` if it is theme-dependent,
  and the `@theme inline` map. Miss one app and that app breaks.
- An undefined token fails silently. `color: var(--missing)` drops the
  declaration and the element inherits, so a white label turns near-black and it
  reads as a styling mistake rather than a missing variable. Nothing errors and
  the build stays green.
- Before swapping a token in `packages/ui`, check every app defines the
  replacement:
  `grep -l "\-\-token-name" apps/*/src/**/*.css`
- Prefer a token the shared components already rely on over introducing a new
  one.

### Verifying a styling change

- Restart the dev server after editing `packages/ui` or any `styles.css`.
  Tailwind discovers classes in sibling packages through `@source`, and a
  running server does not reliably rescan them. A stale server serves CSS with
  the new utility missing, which looks exactly like a broken style.
- A green `pnpm build` proves the CSS compiles, never that it renders. Colour
  changes need a browser pass in both themes.
- `pnpm lint` enforces the color rules in `apps/fe` and `apps/fe-support`
  through eslint. `apps/landing` is Astro, and template `class` attributes are
  not JS literals, so an AST rule cannot see them; it runs
  `scripts/check-styles.mjs` instead, which covers the same patterns by text.
  Adding an Astro eslint plugin would not close that gap.

### Variants, not class strings

- A repeated class string is a missing variant. Encode it once with `cva` on
  the component in `packages/ui/src/components/` and call
  `<Badge variant="success" />`, not
  `<Badge className="border-2 border-green-300 bg-green-100 text-green-700" />`.
- Compose with `cn()` from `@dashboard/ui/lib/utils`. Never build a class string
  with concatenation or template literals.
- `className` on a shared component is for layout only — spacing, width,
  alignment. Color and shape belong to the variant.

### Reuse before markup

- Check `packages/ui/src/components/` first. `Spinner` exists — do not hand-roll
  `<Loader2 className="h-4 w-4 animate-spin" />` again.
- The same visual block appearing twice becomes a component. Rows that differ
  only by data are one component with props.
- Two apps consume it, it moves to `packages/ui`. One app only, it stays in
  `apps/fe/src/components/<feature>/`.
- No component defined inside another component's file. A `function StatCard()`
  or a repeated styled block in a page file moves to its own file in the feature
  folder, even when the file is short. Two exceptions: a file whose purpose is
  to export a set of related primitives (`log-page-shell.tsx`), and a route
  file, which co-locates its `component`, `errorComponent`, and
  `pendingComponent` because that is how TanStack Router is wired.
- Buttons and cards especially: use `Button` and `Card` from `packages/ui` with
  variants. Never rebuild one from `<div>` plus utility classes.

### Where CSS goes

- Component styling is Tailwind utilities in JSX. No inline `style={{}}` except
  a genuinely runtime value (measured pixel, org-configured color from the API).
- Global styles, third-party overrides (FullCalendar `.fc`), keyframes, and
  `@layer utilities` go in `styles.css`. Nothing feature-specific.
- No CSS modules, no styled-components, no per-component `.css` file.
- Repeated styling is a component variant, not an `@apply` class. `styles.css`
  gets global and third-party styling only.

### File size

- A component file past ~300 lines is a refactor signal. Split inline sub-blocks
  into sibling files in the same feature folder before adding more.
- Extracted pieces stay in the feature folder. Do not add a top-level folder.

## Types

- No `any`. Dynamic EAV fields are where it leaks — model them as a
  discriminated union in `src/types/` keyed on `fieldType`, not `any`.
- `unknown` plus a narrow is acceptable at an API boundary. `as any` never is.

## Performance

- Every route gets an `errorComponent`. `__root.tsx` also gets a
  `notFoundComponent`.
- Heavy dependencies (`mapbox-gl`, `@fullcalendar/*`, `jspdf`, `html2canvas`)
  load through `await import()` inside the handler or `React.lazy`, never a
  top-level import. This matters most in `lib/` helpers, which leak into every
  chunk that imports them.
- Table cells and row components are `memo`'d. The board renders dynamic columns
  times rows.
- `key` is a stable id, never an array index. A statically generated list with
  no ids to key on (`Array.from({ length: rows })` for a skeleton) is the one
  exception, since nothing about it can reorder.
- No `console.log` in committed code.
