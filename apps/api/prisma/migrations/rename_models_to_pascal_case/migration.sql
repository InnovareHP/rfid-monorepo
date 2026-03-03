-- ===== TABLE RENAMES =====

-- Auth Schema
ALTER TABLE auth_schema."user_table" RENAME TO "User";
ALTER TABLE auth_schema."user_account_table" RENAME TO "UserAccount";
ALTER TABLE auth_schema."user_onboarding_table" RENAME TO "UserOnboarding";
ALTER TABLE auth_schema."verification_table" RENAME TO "Verification";
ALTER TABLE auth_schema."organization_table" RENAME TO "Organization";
ALTER TABLE auth_schema."member_table" RENAME TO "Member";
ALTER TABLE auth_schema."invitation_table" RENAME TO "Invitation";
ALTER TABLE auth_schema."admin_activity_log" RENAME TO "AdminActivityLog";

-- Stripe Schema
ALTER TABLE stripe_schema."subscription" RENAME TO "Subscription";
ALTER TABLE stripe_schema."plan_table" RENAME TO "Plan";

-- Board Schema
ALTER TABLE board_schema."fieldPersonInformation" RENAME TO "FieldPersonInformation";
ALTER TABLE board_schema."boardCounty" RENAME TO "BoardCounty";
ALTER TABLE board_schema."boardCountyAssignedTo" RENAME TO "BoardCountyAssignedTo";

-- Liason Schema
ALTER TABLE liason_schema."marketing" RENAME TO "Marketing";
ALTER TABLE liason_schema."expense" RENAME TO "Expense";
ALTER TABLE liason_schema."mileage" RENAME TO "Mileage";


-- ===== COLUMN RENAMES =====

-- Auth Schema: User
ALTER TABLE auth_schema."User" RENAME COLUMN "user_name" TO "name";
ALTER TABLE auth_schema."User" RENAME COLUMN "user_email" TO "email";
ALTER TABLE auth_schema."User" RENAME COLUMN "user_email_verified" TO "emailVerified";
ALTER TABLE auth_schema."User" RENAME COLUMN "user_image" TO "image";
ALTER TABLE auth_schema."User" RENAME COLUMN "user_created_at" TO "createdAt";
ALTER TABLE auth_schema."User" RENAME COLUMN "user_updated_at" TO "updatedAt";
ALTER TABLE auth_schema."User" RENAME COLUMN "user_ban_expires" TO "banExpires";
ALTER TABLE auth_schema."User" RENAME COLUMN "user_is_active" TO "isActive";
ALTER TABLE auth_schema."User" RENAME COLUMN "user_stripe_customer_id" TO "stripeCustomerId";
ALTER TABLE auth_schema."User" RENAME COLUMN "user_is_onboarded" TO "isOnboarded";
ALTER TABLE auth_schema."User" RENAME COLUMN "user_role" TO "role";
ALTER TABLE auth_schema."User" RENAME COLUMN "user_ban_reason" TO "banReason";
ALTER TABLE auth_schema."User" RENAME COLUMN "user_is_banned" TO "banned";

-- Auth Schema: UserAccount
ALTER TABLE auth_schema."UserAccount" RENAME COLUMN "user_account_account_id" TO "accountId";
ALTER TABLE auth_schema."UserAccount" RENAME COLUMN "user_account_provider_id" TO "providerId";
ALTER TABLE auth_schema."UserAccount" RENAME COLUMN "user_account_user_id" TO "userId";
ALTER TABLE auth_schema."UserAccount" RENAME COLUMN "user_account_access_token" TO "accessToken";
ALTER TABLE auth_schema."UserAccount" RENAME COLUMN "user_account_refresh_token" TO "refreshToken";
ALTER TABLE auth_schema."UserAccount" RENAME COLUMN "user_account_id_token" TO "idToken";
ALTER TABLE auth_schema."UserAccount" RENAME COLUMN "user_account_access_token_expires_at" TO "accessTokenExpiresAt";
ALTER TABLE auth_schema."UserAccount" RENAME COLUMN "user_account_scope" TO "scope";
ALTER TABLE auth_schema."UserAccount" RENAME COLUMN "user_account_password" TO "password";
ALTER TABLE auth_schema."UserAccount" RENAME COLUMN "user_account_created_at" TO "createdAt";
ALTER TABLE auth_schema."UserAccount" RENAME COLUMN "user_account_updated_at" TO "updatedAt";

-- Auth Schema: UserOnboarding
ALTER TABLE auth_schema."UserOnboarding" RENAME COLUMN "user_onboarding_id" TO "id";
ALTER TABLE auth_schema."UserOnboarding" RENAME COLUMN "user_onboarding_user_id" TO "userId";
ALTER TABLE auth_schema."UserOnboarding" RENAME COLUMN "user_onboarding_hear_about" TO "hearAbout";
ALTER TABLE auth_schema."UserOnboarding" RENAME COLUMN "user_onboarding_how_to_use" TO "howToUse";
ALTER TABLE auth_schema."UserOnboarding" RENAME COLUMN "user_onboarding_what_to_expect" TO "whatToExpect";
ALTER TABLE auth_schema."UserOnboarding" RENAME COLUMN "user_onboarding_created_at" TO "createdAt";

-- Auth Schema: Verification
ALTER TABLE auth_schema."Verification" RENAME COLUMN "verification_identifier" TO "identifier";
ALTER TABLE auth_schema."Verification" RENAME COLUMN "verification_value" TO "value";
ALTER TABLE auth_schema."Verification" RENAME COLUMN "verification_expires_at" TO "expiresAt";
ALTER TABLE auth_schema."Verification" RENAME COLUMN "verification_created_at" TO "createdAt";
ALTER TABLE auth_schema."Verification" RENAME COLUMN "verification_updated_at" TO "updatedAt";

-- Auth Schema: AdminActivityLog
ALTER TABLE auth_schema."AdminActivityLog" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE auth_schema."AdminActivityLog" RENAME COLUMN "admin_id" TO "adminId";
ALTER TABLE auth_schema."AdminActivityLog" RENAME COLUMN "target_user_id" TO "targetUserId";
ALTER TABLE auth_schema."AdminActivityLog" RENAME COLUMN "target_org_id" TO "targetOrgId";
ALTER TABLE auth_schema."AdminActivityLog" RENAME COLUMN "ip_address" TO "ipAddress";

-- Stripe Schema: Subscription
ALTER TABLE stripe_schema."Subscription" RENAME COLUMN "subscription_plan" TO "plan";
ALTER TABLE stripe_schema."Subscription" RENAME COLUMN "subscription_reference_id" TO "referenceId";
ALTER TABLE stripe_schema."Subscription" RENAME COLUMN "subscription_stripe_customer_id" TO "stripeCustomerId";
ALTER TABLE stripe_schema."Subscription" RENAME COLUMN "subscription_stripe_subscription_id" TO "stripeSubscriptionId";
ALTER TABLE stripe_schema."Subscription" RENAME COLUMN "subscription_status" TO "status";
ALTER TABLE stripe_schema."Subscription" RENAME COLUMN "subscription_period_start" TO "periodStart";
ALTER TABLE stripe_schema."Subscription" RENAME COLUMN "subscription_period_end" TO "periodEnd";
ALTER TABLE stripe_schema."Subscription" RENAME COLUMN "subscription_cancel_at_period_end" TO "cancelAtPeriodEnd";
ALTER TABLE stripe_schema."Subscription" RENAME COLUMN "subscription_seats" TO "seats";
ALTER TABLE stripe_schema."Subscription" RENAME COLUMN "subscription_trial_start" TO "trialStart";
ALTER TABLE stripe_schema."Subscription" RENAME COLUMN "subscription_trial_end" TO "trialEnd";
ALTER TABLE stripe_schema."Subscription" RENAME COLUMN "subscription_cancel_at" TO "cancelAt";

-- Stripe Schema: Plan
ALTER TABLE stripe_schema."Plan" RENAME COLUMN "plan_id" TO "id";
ALTER TABLE stripe_schema."Plan" RENAME COLUMN "plan_name" TO "name";
ALTER TABLE stripe_schema."Plan" RENAME COLUMN "plan_price_id" TO "priceId";
ALTER TABLE stripe_schema."Plan" RENAME COLUMN "plan_created_at" TO "createdAt";
ALTER TABLE stripe_schema."Plan" RENAME COLUMN "plan_updated_at" TO "updatedAt";
ALTER TABLE stripe_schema."Plan" RENAME COLUMN "plan_photo" TO "photo";
ALTER TABLE stripe_schema."Plan" RENAME COLUMN "plan_description" TO "description";
ALTER TABLE stripe_schema."Plan" RENAME COLUMN "plan_role_available" TO "roleAvailable";
ALTER TABLE stripe_schema."Plan" RENAME COLUMN "plan_is_active" TO "isActive";
ALTER TABLE stripe_schema."Plan" RENAME COLUMN "plan_type" TO "type";
ALTER TABLE stripe_schema."Plan" RENAME COLUMN "plan_limit" TO "limits";

-- Board Schema: Field
ALTER TABLE board_schema."Field" RENAME COLUMN "field_name" TO "fieldName";
ALTER TABLE board_schema."Field" RENAME COLUMN "field_order" TO "fieldOrder";
ALTER TABLE board_schema."Field" RENAME COLUMN "field_type" TO "fieldType";
ALTER TABLE board_schema."Field" RENAME COLUMN "module_type" TO "moduleType";
ALTER TABLE board_schema."Field" RENAME COLUMN "organization_id" TO "organizationId";
ALTER TABLE board_schema."Field" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE board_schema."Field" RENAME COLUMN "updated_at" TO "updatedAt";

-- Board Schema: Board
ALTER TABLE board_schema."Board" RENAME COLUMN "record_name" TO "recordName";
ALTER TABLE board_schema."Board" RENAME COLUMN "assigned_to" TO "assignedTo";
ALTER TABLE board_schema."Board" RENAME COLUMN "is_deleted" TO "isDeleted";
ALTER TABLE board_schema."Board" RENAME COLUMN "module_type" TO "moduleType";
ALTER TABLE board_schema."Board" RENAME COLUMN "organization_id" TO "organizationId";
ALTER TABLE board_schema."Board" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE board_schema."Board" RENAME COLUMN "updated_at" TO "updatedAt";

-- Board Schema: FieldValue
ALTER TABLE board_schema."FieldValue" RENAME COLUMN "record_id" TO "recordId";
ALTER TABLE board_schema."FieldValue" RENAME COLUMN "field_id" TO "fieldId";

-- Board Schema: FieldOption
ALTER TABLE board_schema."FieldOption" RENAME COLUMN "option_name" TO "optionName";
ALTER TABLE board_schema."FieldOption" RENAME COLUMN "is_deleted" TO "isDeleted";
ALTER TABLE board_schema."FieldOption" RENAME COLUMN "field_id" TO "fieldId";

-- Board Schema: History
ALTER TABLE board_schema."History" RENAME COLUMN "record_id" TO "recordId";
ALTER TABLE board_schema."History" RENAME COLUMN "old_value" TO "oldValue";
ALTER TABLE board_schema."History" RENAME COLUMN "new_value" TO "newValue";
ALTER TABLE board_schema."History" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE board_schema."History" RENAME COLUMN "created_by" TO "createdBy";

-- Board Schema: BoardNotificationState
ALTER TABLE board_schema."BoardNotificationState" RENAME COLUMN "record_id" TO "recordId";
ALTER TABLE board_schema."BoardNotificationState" RENAME COLUMN "last_seen" TO "lastSeen";
ALTER TABLE board_schema."BoardNotificationState" RENAME COLUMN "updated_at" TO "updatedAt";

-- Board Schema: BoardCounty
ALTER TABLE board_schema."BoardCounty" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE board_schema."BoardCounty" RENAME COLUMN "county_name" TO "countyName";
ALTER TABLE board_schema."BoardCounty" RENAME COLUMN "organization_id" TO "organizationId";

-- Board Schema: BoardCountyAssignedTo
ALTER TABLE board_schema."BoardCountyAssignedTo" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE board_schema."BoardCountyAssignedTo" RENAME COLUMN "assigned_to" TO "assignedTo";
ALTER TABLE board_schema."BoardCountyAssignedTo" RENAME COLUMN "board_county_id" TO "boardCountyId";

-- Board Schema: Activity
ALTER TABLE board_schema."Activity" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE board_schema."Activity" RENAME COLUMN "updated_at" TO "updatedAt";
ALTER TABLE board_schema."Activity" RENAME COLUMN "activity_type" TO "activityType";
ALTER TABLE board_schema."Activity" RENAME COLUMN "due_date" TO "dueDate";
ALTER TABLE board_schema."Activity" RENAME COLUMN "completed_at" TO "completedAt";
ALTER TABLE board_schema."Activity" RENAME COLUMN "recipient_email" TO "recipientEmail";
ALTER TABLE board_schema."Activity" RENAME COLUMN "email_subject" TO "emailSubject";
ALTER TABLE board_schema."Activity" RENAME COLUMN "email_body" TO "emailBody";
ALTER TABLE board_schema."Activity" RENAME COLUMN "email_sent_at" TO "emailSentAt";
ALTER TABLE board_schema."Activity" RENAME COLUMN "sender_email" TO "senderEmail";
ALTER TABLE board_schema."Activity" RENAME COLUMN "record_id" TO "recordId";
ALTER TABLE board_schema."Activity" RENAME COLUMN "created_by" TO "createdBy";
ALTER TABLE board_schema."Activity" RENAME COLUMN "organization_id" TO "organizationId";

-- Board Schema: GmailToken
ALTER TABLE board_schema."GmailToken" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE board_schema."GmailToken" RENAME COLUMN "updated_at" TO "updatedAt";
ALTER TABLE board_schema."GmailToken" RENAME COLUMN "user_id" TO "userId";
ALTER TABLE board_schema."GmailToken" RENAME COLUMN "access_token" TO "accessToken";
ALTER TABLE board_schema."GmailToken" RENAME COLUMN "refresh_token" TO "refreshToken";
ALTER TABLE board_schema."GmailToken" RENAME COLUMN "token_expiry" TO "tokenExpiry";
ALTER TABLE board_schema."GmailToken" RENAME COLUMN "gmail_address" TO "gmailAddress";

-- Board Schema: OutlookToken
ALTER TABLE board_schema."OutlookToken" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE board_schema."OutlookToken" RENAME COLUMN "updated_at" TO "updatedAt";
ALTER TABLE board_schema."OutlookToken" RENAME COLUMN "user_id" TO "userId";
ALTER TABLE board_schema."OutlookToken" RENAME COLUMN "access_token" TO "accessToken";
ALTER TABLE board_schema."OutlookToken" RENAME COLUMN "refresh_token" TO "refreshToken";
ALTER TABLE board_schema."OutlookToken" RENAME COLUMN "token_expiry" TO "tokenExpiry";
ALTER TABLE board_schema."OutlookToken" RENAME COLUMN "outlook_email" TO "outlookEmail";

-- Update indexes that reference old column names
DROP INDEX IF EXISTS board_schema."Field_field_name_idx";
CREATE INDEX "Field_fieldName_idx" ON board_schema."Field"("fieldName");

DROP INDEX IF EXISTS board_schema."Board_organization_id_record_name_idx";
CREATE INDEX "Board_organizationId_recordName_idx" ON board_schema."Board"("organizationId", "recordName");

DROP INDEX IF EXISTS board_schema."boardCounty_organization_id_idx";
CREATE INDEX "BoardCounty_organizationId_idx" ON board_schema."BoardCounty"("organizationId");

DROP INDEX IF EXISTS board_schema."boardCountyAssignedTo_board_county_id_idx";
CREATE INDEX "BoardCountyAssignedTo_boardCountyId_idx" ON board_schema."BoardCountyAssignedTo"("boardCountyId");

DROP INDEX IF EXISTS board_schema."Activity_record_id_idx";
CREATE INDEX "Activity_recordId_idx" ON board_schema."Activity"("recordId");

DROP INDEX IF EXISTS board_schema."Activity_organization_id_idx";
CREATE INDEX "Activity_organizationId_idx" ON board_schema."Activity"("organizationId");

DROP INDEX IF EXISTS board_schema."Activity_due_date_idx";
CREATE INDEX "Activity_dueDate_idx" ON board_schema."Activity"("dueDate");
