-- Form.slug and LandingPage.slug were globally unique, which put every tenant
-- in one namespace: the first organization to publish "contact-us" took the
-- name away from all the others.
--
-- Worse, the check that picked a free slug could not see the collision. Form
-- and LandingPage both carry organizationId, so the tenant extension rewrites
-- their reads to the active organization; the uniqueness probe therefore only
-- ever saw its own rows, reported the slug free, and the insert died on the
-- global constraint with P2002. The retry regenerated the same slug and died
-- the same way.
--
-- Scoping the constraint to the organization makes the probe and the index
-- agree. The public URL now carries the organization slug to keep the lookup
-- unambiguous: /f/<orgSlug>/<slug> and /l/<orgSlug>/<slug>.
--
-- This only relaxes uniqueness, so it cannot fail on existing data. Slugs
-- already suffixed to dodge another tenant ("contact-us-2") stay as they are;
-- nothing renames them, because their public links are live.

ALTER TABLE marketing_schema."Form" DROP CONSTRAINT IF EXISTS "Form_slug_key";
DROP INDEX IF EXISTS marketing_schema."Form_slug_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Form_organizationId_slug_key"
  ON marketing_schema."Form" ("organizationId", "slug");

ALTER TABLE marketing_schema."LandingPage" DROP CONSTRAINT IF EXISTS "LandingPage_slug_key";
DROP INDEX IF EXISTS marketing_schema."LandingPage_slug_key";

CREATE UNIQUE INDEX IF NOT EXISTS "LandingPage_organizationId_slug_key"
  ON marketing_schema."LandingPage" ("organizationId", "slug");
