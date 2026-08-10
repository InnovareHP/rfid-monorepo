-- Passkeys are optional: password sign-in is the primary path and the passkey
-- offer after login can be declined. This records that decision so the offer is
-- made once instead of on every sign-in.

ALTER TABLE auth_schema."User"
  ADD COLUMN IF NOT EXISTS "passkeyPromptWaivedAt" TIMESTAMPTZ(3);
