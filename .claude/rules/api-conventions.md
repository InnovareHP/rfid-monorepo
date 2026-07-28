# API conventions (apps/api)

## Layering

- Controller = HTTP boundary only: routing, `@UseGuards`, DTO validation,
  session extraction. No Prisma queries in controllers.
- Service = business logic and all data access.
- DTOs live in `api/<feature>/dto/`. Follow `api/board/dto/board.schema.ts`.

Controllers guard with `@UseGuards(AuthGuard)` from
`@thallesp/nestjs-better-auth`, plus the repo guards in `src/guard/`
(`role.guard.ts`, `onboarding.guard.ts`, `stripe.guard.ts`) where the route
needs them. See `api/board/board.controller.ts` as the reference shape.

## Data access

- Prisma is a singleton: `import { prisma } from "../../lib/prisma/prisma"`.
  Never construct a new `PrismaClient`.
- Better Auth models use custom field names (`user_table.user_id`,
  `user_email`, `organization_id`) — not Prisma defaults. Check
  `src/lib/auth/auth.ts` before writing any auth-table query.
- Every query is organization-scoped. Read
  `session.session.activeOrganizationId`, `memberId`, `memberRole` and filter on
  the org. A query that can return another tenant's rows is a bug.

## Schema changes

Prisma models are split across `prisma/models/*.prisma`; `schema.prisma` holds
only datasource and generator.

1. Edit the right file in `prisma/models/`.
2. `pnpm prisma:generate`
3. `pnpm prisma:migrate`
4. If auth tables changed, `pnpm --filter api auth:generate`

`prisma:push` and `prisma:reset` are destructive and blocked by the PreToolUse
hook — the user runs those.

## PHI and secrets

- PHI columns are encrypted at rest via `src/lib/crypto/crypto.ts`
  (`encryptString`, `decryptString`, `encryptNullable`, `decryptNullable`,
  `isEncrypted`). Never store a new PHI field in plaintext, and never widen a
  query so PHI leaves the org scope.
- Mutations that touch records go through the audit path in `src/lib/audit/`.
- Never print, log, or paste credentials, connection strings, or customer
  personal data. `.env*` reads are denied in `settings.json`.

## Config

Access config through the Zod-validated `appConfig` export in
`src/config/app-config.ts`, not NestJS `ConfigService`. Global prefix is `/api`;
Swagger at `/api/docs`.
