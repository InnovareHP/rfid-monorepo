# Testing and verification

## Commands

```bash
pnpm test:fe                                   # Vitest, apps/fe
pnpm --filter fe exec vitest run path/to/file.test.tsx   # single file
pnpm lint                                      # eslint --fix across packages
pnpm build:shared                              # required before api build/dev
pnpm build:api                                 # builds shared first, then nest
pnpm build:fe                                  # vite build + tsc
```

## Gotchas that will bite

- `pnpm build:shared` must run before `pnpm dev:api` or `pnpm build:api`.
  `packages/shared` resolves to compiled `dist/*.js` under CJS `require()`, so a
  stale build means the API runs old code with no error.
- `pnpm build:fe` runs `vite build && tsc`. Vite passes while `tsc` still
  reports pre-existing errors — check whether an error is yours before chasing
  it.
- `apps/fe` has effectively no test suite yet (one test file). "Tests pass" is
  not evidence a change works. Verify with `pnpm build:fe` plus IDE
  diagnostics, and say plainly what was and was not verified.
- Editing `.tsx` in `apps/fe` triggers an import-reordering formatter. For pure
  import rewrites use `sed` via Bash instead of Edit.
- `apps/api` has no test script. Verify it with `pnpm build:api` and lint.

## Writing tests

- Vitest + `@testing-library/react`. Tests sit next to the source as
  `*.test.tsx`.
- Test behaviour through the component or service boundary, not internals.
- Cover the org-scoping and role branches when touching anything multi-tenant.

## Reporting

Report outcomes literally. If a build fails, quote the error. If a step was
skipped, say so. Never call something verified that was not run.
