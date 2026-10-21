-- Members opt out of the weekly digest from its unsubscribe link; everyone starts opted in.
ALTER TABLE auth_schema."Member"
ADD COLUMN "weeklyDigest" BOOLEAN NOT NULL DEFAULT true;
