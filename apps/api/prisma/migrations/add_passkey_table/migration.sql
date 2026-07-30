-- Adds the Better Auth passkey table plus an aaguid column for device labelling.
-- Additive only, one new table in auth_schema.

CREATE TABLE IF NOT EXISTS auth_schema."Passkey" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "publicKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "credentialID" TEXT NOT NULL,
  "counter" INTEGER NOT NULL,
  "deviceType" TEXT NOT NULL,
  "backedUp" BOOLEAN NOT NULL,
  "transports" TEXT,
  "createdAt" TIMESTAMPTZ(3),
  "aaguid" TEXT,
  CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Passkey_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES auth_schema."User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Passkey_credentialID_key"
  ON auth_schema."Passkey" ("credentialID");

CREATE INDEX IF NOT EXISTS "Passkey_userId_idx"
  ON auth_schema."Passkey" ("userId");
