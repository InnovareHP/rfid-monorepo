# Passkey-only auth

Ported from the fax app's design (Obsidian vault: `wiki/concepts/passkey-only-auth.md`).
WebAuthn passkeys become the only way in. Password sign-in, Google/Microsoft
OAuth, and every session-granting email path are disabled.

## Threat model carried over

Every shareable credential is a way to hand an account to someone else. A
password, a Google password, and an emailed code are all forwardable; a
device-bound credential with `userVerification: "required"` is not.

1. Mailbox control must never be an account-access path. Every "prove you can
   read email" route is blocked or downgraded to enrollment only, never a session.
2. Account sharing is detected by device count, not by login. Enrollment counts
   and sign-in device fingerprints are both tracked and both alert.

## Dependency upgrade (required, not optional)

`registration: { requireSession: false, resolveUser, afterVerification }` — the
mechanism the whole design hangs on — does not exist in
`@better-auth/passkey@1.5.2`, whose register-options endpoint sits behind
`sessionMiddleware`. It first appears in 1.6.25.

- `better-auth`, `@better-auth/core`, `@better-auth/stripe` 1.5.2 -> 1.6.25
- `@better-auth/passkey` 1.6.25 added to `apps/api` and `apps/fe`
- `better-auth` 1.6.25 in `apps/fe-support`
- `@thallesp/nestjs-better-auth@2.1.0` peers `better-auth >=1.3.8 <2.0.0`, so it
  did not block the bump
- `build:api` and `build:fe` both pass with no source changes for the upgrade
  itself, so no 1.5 -> 1.6 plugin API drift in organization, admin, stripe,
  twoFactor, oneTimeToken, or customSession
- `GenericEndpointContext` moved from `better-auth/types` to `@better-auth/core`

## Backend

### Plugin configuration (`src/lib/auth/auth.ts`)

```ts
passkey({
  rpID: appConfig.PASSKEY_RP_ID,
  rpName: appConfig.APP_NAME,
  origin: isLocalDev ? DEV_ORIGINS : appConfig.WEBSITE_URL,
  authenticatorSelection: { residentKey: "required", userVerification: "required" },
  registration: { requireSession: false, resolveUser, afterVerification },
  authentication: { afterVerification },
})
```

`origin` is the frontend origin, never `API_URL` — the ceremony runs in the
browser and the verifier compares against the browser origin.

Commented out, not deleted, so the previous configuration stays recoverable:
`socialProviders`, `emailAndPassword`, `emailVerification`, `haveIBeenPwned()`.
Rate-limit `customRules` moved from the password routes onto the passkey routes.

### New files

```
src/lib/auth/passkey-registration.ts    Redis enrollment tokens (signup / recovery claims)
src/lib/auth/registration-otp-store.ts  hashed OTP store, separate signup/migration namespaces
src/lib/auth/passkey-enrollment.ts      device cap + owner notification
src/lib/auth/passkey-hooks.ts           resolveUser / afterVerification / sign-in alert wiring
src/lib/auth/session-devices.ts         new-device sign-in alerts
src/lib/auth/session-path-guard.ts      blocks session-granting email paths
src/lib/auth/authenticator-names.ts     aaguid -> device label
src/lib/auth/sliding-limiter.ts         Redis window counter with cooldown block
src/api/passkeys/                       list / enrollment-code / remove / owner reset
src/api/registration/                   signup OTP, invitation context, migration bootstrap
src/react-email/passkey-enrolled-email.tsx
src/react-email/new-device-sign-in-email.tsx
```

### Enrollment tokens

The `context` string is the entire authorization, so it is unguessable rather
than signed: `randomBytes` held in Redis under `passkey:reg:<token>`.

| Claim | Payload | Bytes | TTL |
|---|---|---|---|
| `signup` | email, name, displayName | 32 | 10 min |
| `recovery` | userId, email | 20 | 24 h (owner reset) / 10 min (self) |

`peek` is non-consuming when generating registration options, because the
ceremony may still be abandoned at the biometric prompt. `consume` uses atomic
`GETDEL` only after WebAuthn verifies, so one grant yields exactly one
credential and an abandoned prompt leaves the token reusable.

### resolveUser / afterVerification

- Signup resolves a placeholder `pending:<context>` for the ceremony only; the
  real user row is created in `afterVerification` via
  `internalAdapter.createUser({ emailVerified: true })`, so an abandoned prompt
  leaves no orphan account.
- Before creating, an existing-email check refuses to attach.
- Recovery returns the real `userId`.
- No `context` means an authenticated user adding another device: enforce the
  5-device cap and notify the org owners.

### OTP store

Better Auth's `emailOTP` plugin resolves an existing user and mints a session,
so it can serve neither signup (no user row yet) nor migration (a session is
exactly what must not be issued).

- Codes stored sha256-hashed in Redis, compared with `timingSafeEqual`
- 5-minute TTL, 5 attempts, attempt counted before comparison
- Verified codes deleted, so one code cannot mint a second token
- Separate `signup` / `migration` key namespaces

### Ways to get a credential

1. Signup — `POST /registration/otp/send` -> `/otp/verify` -> signup token -> ceremony creates the account
2. Invited member — `POST /registration/invitation/context`; an unexpired pending
   invitation already proves mailbox control and the email comes from the
   invitation row, not the caller, so no code is sent
3. Second device — `POST /passkeys/enrollment-code`, a 10-minute code carried to
   the other machine; cap checked before the user walks over
4. Owner-mediated recovery — `POST /passkeys/members/:memberId/reset`, owner
   only, deletes every passkey on the member and returns a 24-hour code to the
   caller, never by email; self-reset rejected
5. Migration bootstrap — `POST /registration/migrate/send|verify` for accounts
   predating passkeys: zero-passkey users only, until
   `PASSKEY_MIGRATION_DEADLINE`, never mints a session, identical
   success-shaped response on every eligibility failure, eligibility re-checked
   after the code verifies

### Anti-sharing

- `MAX_PASSKEYS_PER_USER = 5`, enforced in `afterVerification` and pre-checked
  when issuing an enrollment code
- Owner email on every enrollment, best-effort: a notification failure must not
  fail an enrollment the user already completed
- New-device sign-in alerts keyed on `sha256(userAgent | /24 network)`, 180-day
  Redis TTL, first device suppressed. Deliberately coarse so a mobile IP change
  does not train users to ignore the alert
- Signed-in places already existed on the profile page via
  `authClient.listSessions()`, so no new endpoint was added

### HTTP surface

| Route | Guard / limit |
|---|---|
| `GET /passkeys` | own devices, label from `aaguid` at read time |
| `POST /passkeys/enrollment-code` | 5 per hour, then a 15-min block |
| `DELETE /passkeys/:passkeyId` | 409 on the last device |
| `POST /passkeys/members/:memberId/reset` | `AdminRoleGuard` (owner), audited `USER_PASSKEYS_RESET` with IP/UA |
| `/registration/otp/send`, `/migrate/send` | 3 per 10 min keyed per email |
| `/registration/otp/verify`, `/invitation/context`, `/migrate/verify` | 10 per min per IP |

### Data model

`auth_schema.Passkey` is Better Auth's table plus `aaguid`, unique on
`credentialID`, `onDelete: Cascade` from `User`, with a `passkeys` relation added
to `User`. Enrollment tokens, OTPs, and known-device sets are Redis-only.

Migration follows the repo convention of a manual SQL folder:
`prisma/migrations/add_passkey_table/migration.sql`.

### Config

`PASSKEY_RP_ID` (default `localhost`) must be the registrable domain of
`WEBSITE_URL` or a registrable parent. `PASSKEY_MIGRATION_DEADLINE` defaults to
`""`, which leaves the migration path open indefinitely.

## Frontend (apps/fe only)

- `lib/auth-client.ts` — `passkeyClient()` added
- `login-form.tsx` — single `authClient.signIn.passkey()` button, no email field
  (discoverable credentials let the browser offer the accounts it holds).
  Password, social, and forgot-password UI removed; the support/super_admin
  dashboard-picker dialog kept
- `components/passkeys/device-setup-modal.tsx` — `choose -> paste | email -> code
  -> enroll` state machine, ends in `passkey.addPasskey({ context })`
- `components/passkeys/passkeys-card.tsx` — device list with backed-up badge,
  add this device, remove (disabled at a single device), enrollment code with
  copy-to-clipboard. Replaces the change-password form in the profile Security card
- `components/passkeys/passkey-reset-modal.tsx` — owner action on the team page,
  shows the recovery code once and states it is never emailed
- `register-form.tsx` — email/name -> code -> passkey; no password fields
- `invitation/invitation.tsx` — create a passkey and join (via invitation
  context) or sign in with an existing passkey; both password forms removed
- `reset-password-form.tsx`, `reset-password-verify.tsx` — neutered, explain that
  recovery goes through an owner

`apps/fe-support` has no login route of its own; it consumes the session
established in `apps/fe`, so it needed no UI change.

## Verification

- `pnpm build:shared` — passes
- `pnpm build:api` — passes
- `pnpm build:fe` — vite build and `tsc` both pass
- `pnpm --filter api lint` — no errors in any new or modified file. Pre-existing
  errors elsewhere in the repo are unchanged
- `apps/api` has no test script and `apps/fe` has effectively no suite, so
  nothing here is covered by tests. No runtime ceremony was exercised

## Not done

- Manual SQL migration not applied. Run:
  `pnpm --filter api exec prisma db execute --file prisma/migrations/add_passkey_table/migration.sql --schema=./prisma`
- No end-to-end run of any ceremony (registration, sign-in, recovery)
- No tests written
- `pnpm --filter api auth:generate` not run

## Sharp edges

- The enrollment code is the credential until consumed. It is unguessable and
  single-use, but its transport is human — clipboard, chat, a screenshot
- The signup path confirms whether an email is registered. Accepted trade for a
  usable flow; the migration path deliberately does the opposite
- A recovery grant stays live for 24 hours with no revoke endpoint, on an account
  whose devices were just deleted
- `PASSKEY_MIGRATION_DEADLINE` defaults to open indefinitely. Until it is set in
  deployed envs, mailbox control remains a first-device bootstrap for any
  zero-passkey account
- `PASSKEY_RP_ID` defaults to `localhost`; if it is not a registrable suffix of
  the serving origin, every ceremony fails in the browser
- Passkey signup creates the user through `internalAdapter.createUser`, which
  runs configured user-create database hooks. Stripe's
  `createCustomerOnSignUp: true` should therefore still fire, but that was not
  verified at runtime
- The `twoFactor` plugin stays configured, but with password sign-in gone its OTP
  challenge is no longer on any sign-in path — dead configuration worth a look
- `only-throw-error` and `require-await` are switched off for
  `src/lib/auth/**` in `apps/api/eslint.config.mjs`: Better Auth declares
  `APIError` as a const with a constructor type rather than a class, and its
  middleware must be async even when nothing is awaited
- Every existing user is locked out until they enroll a first passkey through the
  migration path
