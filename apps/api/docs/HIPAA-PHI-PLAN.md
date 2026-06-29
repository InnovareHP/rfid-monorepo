# HIPAA / PHI Compliance Plan

Status: in progress. Owner: backend team. Target: production-ready Phase 1-4 before launch.

## 1. Scope

This API stores PHI (Protected Health Information) for lead/admission management. HIPAA Security Rule (45 CFR §164.302-318) and Privacy Rule apply. A signed BAA is required with every subprocessor that touches PHI.

## 2. PHI / PII Inventory

| Schema | Model | Fields | Sensitivity | Notes |
|---|---|---|---|---|
| `board_schema` | `FieldPersonInformation` | `contactNumber`, `email`, `address` | PHI | Plaintext today. Must encrypt at rest. |
| `board_schema` | `FieldValue` | `value` | PHI (EAV) | Free-form; can hold any PHI. Encrypt + audit. |
| `board_schema` | `Activity` | `recipientEmail`, `emailSubject`, `emailBody`, `senderEmail`, `description` | PHI | Email content. Encrypt body + subject. |
| `board_schema` | `Board` | `recordName`, `assignedTo` | PHI (name) | Record name often = patient name. |
| `board_schema` | `History` | `oldValue`, `newValue` | PHI | Audit row of PHI = also PHI. Encrypt. |
| `board_schema` | `GmailToken`, `OutlookToken` | `accessToken`, `refreshToken`, `gmailAddress` | Secrets | **Critical**: plaintext OAuth tokens. Encrypt now. |
| `calendar_schema` | `GoogleCalendarToken`, `OutlookCalendarToken` | `accessToken`, `refreshToken`, `email` | Secrets | Same as above. |
| `auth_schema` | `User` | `name`, `email`, `image` | PII | Standard identifiers. |
| `auth_schema` | `UserAccount` | `accessToken`, `refreshToken`, `idToken`, `password` | Secrets | Better Auth managed. Password is hashed; tokens are not encrypted at rest. |
| `liason_schema` | `Marketing`, `Mileage`, `Expense` | `notes`, `description`, `destination` | Possible PHI | Free-form notes may reference patients. |
| `support_schema` | `SupportTicket*` | message bodies, attachments | Possible PHI | Treat as PHI. |
| `auth_schema` | `AdminActivityLog` | `details`, `ipAddress` | PII | Already audit-only. |

## 3. Current State (Gaps)

| Area | Status | HIPAA Ref |
|---|---|---|
| Encryption at rest (DB) | Provider-level only, no column-level for PHI | §164.312(a)(2)(iv) |
| Encryption in transit | TLS via Better Auth + CORS; verify HSTS at edge | §164.312(e)(1) |
| Access control / RBAC | `owner`, `liason`, `admission_manager`; no field-level PHI gating | §164.312(a)(1) |
| Audit log (system-wide) | **Missing**. Only `AdminActivityLog` (admin actions) and `History` (Board field changes) | §164.312(b) |
| Auth events (login/logout/reset) | Not logged | §164.312(b) |
| PHI read tracking | Not logged | §164.312(b) |
| Session timeout | Default Better Auth, not constrained | §164.312(a)(2)(iii) |
| Auto-logoff | Not enforced | §164.312(a)(2)(iii) |
| Unique user ID | Yes (Better Auth) | §164.312(a)(2)(i) |
| Emergency access | Not defined | §164.312(a)(2)(ii) |
| Data integrity (checksums) | Not implemented | §164.312(c)(1) |
| Backup + disposal | Provider-level; no documented policy | §164.308(a)(7) |
| Retention (6 yr min) | Not enforced | §164.530(j) |
| BAA tracker | Not present | §164.308(b) |
| Subprocessor PHI exposure | Gemini receives raw PHI for AI analytics — **violation risk** | §164.314 |
| Log hygiene | `LoggerMiddleware` writes URLs to stdout; `AllExceptionsFilter` echoes raw exception | §164.312(b) |
| Swagger in prod | Enabled at `/api/docs` — leaks schema | hardening |
| Minimum necessary | Full PHI returned regardless of role | §164.502(b) |

## 4. Subprocessor BAA Matrix (action required)

| Vendor | PHI Touched | BAA Status | Action |
|---|---|---|---|
| Postgres host (Neon / Supabase / RDS?) | Yes (all PHI at rest) | TBD | Confirm BAA + region. |
| Redis host | Sessions, possibly cached PHI | TBD | Confirm BAA or eliminate PHI from cache. |
| AWS SES (email) | Patient emails (verification, invites) | Covered under AWS BAA | Enable. Replaced Resend. |
| AWS Bedrock (Claude) | Free-text PHI for analytics + business-card vision | Covered under AWS BAA | Enable in HIPAA-eligible region. Replaced Gemini. |
| Cloudinary (images) | Possible PHI in uploaded receipts / IDs | TBD | Cloudinary BAA available on enterprise — or migrate to S3. |
| Stripe | Billing only (no PHI) | N/A | Limit to billing. |
| Google OAuth / Gmail API | Email content | Google Workspace BAA required | Confirm. |
| Microsoft Graph / Outlook | Email content | Microsoft BAA required | Confirm. |

## 5. Phased Plan

### Phase 1 — Stop the bleeding (this PR cycle)

1. **Encrypt OAuth tokens at rest** (`GmailToken`, `OutlookToken`, `GoogleCalendarToken`, `OutlookCalendarToken`, `UserAccount.accessToken/refreshToken`). AES-256-GCM keyed by `ENCRYPTION_KEY` env (32-byte base64).
2. **Harden logger** — strip URL query strings, never log bodies, log only `method path status duration actorId requestId`.
3. **Harden error filter** — generic message + correlation ID in prod; full detail only in dev.
4. **Disable Swagger in prod** — gate `SwaggerModule.setup` behind `NODE_ENV !== 'production'`.
5. **Tighten session** — Better Auth `session.expiresIn = 12h`, `session.updateAge = 15m`, idle reset.

### Phase 2 — Audit log

6. **`AuditLog` model** in `auth_schema` (see §6).
7. **Global `AuditInterceptor`** captures every controller request: actor, org, action, resource, ip, ua, status, duration, request id, before/after digest (sha256) for writes.
8. **Auth event hooks** — login success/fail, logout, password reset, MFA, session create/revoke, role change, invitation accept.
9. **PHI export tracking** — explicit `audit.export(...)` call in CSV / report endpoints.
10. **Tamper resistance** — append-only; periodic hash-chain or move to write-only DB role.
11. **Retention** — keep audit rows ≥ 6 years; partition by month.

### Phase 3 — PHI encryption + masking

12. **Column-level encryption** for PHI columns listed in §2 via Prisma client extension (`$extends`). Deterministic encryption only for fields that must be searchable (email lookup); else GCM with random IV.
13. **Backfill migration** — encrypt existing rows in batches.
14. **Field masking by role** — DTO transformers strip/mask PHI for roles that don't need it (e.g., billing role sees `***-**-1234`).
15. **Minimum-necessary review** of every endpoint — does this role need this field?

### Phase 4 — Hygiene + governance

16. **Gemini PHI gate** — de-identify (regex strip names/emails/phones/addresses + tokenize) before request, OR move to Vertex AI under Google Cloud BAA.
17. **Auto-logoff** — frontend idle timer + backend session invalidation.
18. **Emergency access procedure** — documented break-glass account, audited heavily.
19. **Data integrity** — checksums on encrypted PHI columns (HMAC of ciphertext) to detect tampering.
20. **Retention policy** — soft-delete + scheduled purge job after retention window per data class.
21. **Backup policy** — encrypted backups, documented restore drill quarterly.
22. **Workforce training + sanctions policy** — admin task, not code.

## 6. AuditLog Schema (proposed)

```prisma
model AuditLog {
  id             String   @id @default(uuid())
  createdAt      DateTime @default(now()) @db.Timestamptz(3)

  // Actor
  actorUserId    String?
  actorOrgId     String?
  actorRole      String?
  actorIp        String?
  actorUserAgent String?

  // Action
  action         String   // e.g. "lead.read", "lead.update", "auth.login.success"
  resourceType   String?  // e.g. "Board", "FieldValue", "Session"
  resourceId     String?

  // HTTP context
  method         String?
  path           String?
  statusCode     Int?
  durationMs     Int?
  requestId      String?

  // Change tracking
  changeHash     String?  // sha256(before) -> sha256(after)
  metadata       Json?

  @@index([actorUserId, createdAt])
  @@index([actorOrgId, createdAt])
  @@index([resourceType, resourceId])
  @@index([action, createdAt])
  @@schema("auth_schema")
}
```

## 6a. Deferred / Known Limitations

- `FieldValue.value` (EAV) and `LeadFlatView` are NOT yet encrypted. Encrypting breaks `LIKE`/`contains` search and any JSON view query. Requires deterministic encryption + searchable index redesign OR moving search to an app-layer encrypted index. Tracked separately.
- `User.email`, `Invitation.email` not encrypted — required by Better Auth for unique lookup. Treat row-level access controls as the mitigation.
- `BoardCounty`, `Marketing.notes`, `Mileage.destination`, `Expense.description` not yet encrypted; covered in Phase 4 if they hold PHI per data steward review.
- Audit log retention partitioning not yet implemented; single table for now.
- Better Auth fine-grained event hooks (login.success/failure, MFA, password reset success) not yet wired — interceptor captures HTTP traffic for `/api/auth/*` which is sufficient for §164.312(b) baseline.

## 7. Open Questions

- Hosting region — must be US (or BAA-covered region).
- KMS strategy — env var key for now, migrate to AWS KMS / GCP KMS envelope encryption when infra ready.
- Who is the Security Officer / Privacy Officer of record? (§164.308(a)(2))
- Incident response runbook owner?
- Will analytics need de-identified data set, or aggregate-only?

## 8. Definition of Done

- All Phase 1-3 tasks merged and migrated.
- BAA matrix all green.
- Penetration test passed.
- Risk assessment doc signed off (§164.308(a)(1)(ii)(A)).
- Workforce training completed.
- Incident response plan published.
