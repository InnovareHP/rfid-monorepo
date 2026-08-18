-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth_schema";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "board_schema";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "booking_schema";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "calendar_schema";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "liason_schema";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "marketing_schema";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notification_schema";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public_schema";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "stripe_schema";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "support_schema";

CREATE SEQUENCE IF NOT EXISTS support_schema.ticket_seq START 1;

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  seq INT;
BEGIN
  SELECT nextval('support_schema.ticket_seq') INTO seq;
  RETURN 'TCK-' || to_char(now(), 'YYYY') || '-' || lpad(seq::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "task_schema";

-- CreateEnum
CREATE TYPE "auth_schema"."AdminAction" AS ENUM ('BAN_USER', 'UNBAN_USER', 'SET_ROLE', 'REMOVE_USER', 'IMPERSONATE_USER', 'STOP_IMPERSONATE', 'SET_PASSWORD', 'REVOKE_SESSIONS', 'UPDATE_USER', 'SET_ENTITLEMENT');

-- CreateEnum
CREATE TYPE "auth_schema"."AgreementKind" AS ENUM ('BAA', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "auth_schema"."AcceptanceMethod" AS ENUM ('signature', 'offline');

-- CreateEnum
CREATE TYPE "board_schema"."ActivityType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'NOTE', 'FAX');

-- CreateEnum
CREATE TYPE "board_schema"."ActivityStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "board_schema"."EmailDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "board_schema"."ModuleType" AS ENUM ('LEAD', 'REFERRAL', 'CONTACT', 'COMPANY');

-- CreateEnum
CREATE TYPE "board_schema"."StageType" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "board_schema"."RelationType" AS ENUM ('REFERRAL_LINK', 'FACILITY_LINK', 'CONTACT_LINK', 'COMPANY_LINK');

-- CreateEnum
CREATE TYPE "board_schema"."BoardFieldType" AS ENUM ('TEXT', 'NUMBER', 'STATUS', 'EMAIL', 'PHONE', 'DATE', 'CHECKBOX', 'DROPDOWN', 'LOCATION', 'TIMELINE', 'MULTISELECT', 'ASSIGNED_TO', 'REFERRAL_LINK', 'CONTACT_LINK', 'COMPANY_LINK', 'PERSON');

-- CreateEnum
CREATE TYPE "booking_schema"."BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "booking_schema"."CalendarProvider" AS ENUM ('GOOGLE', 'OUTLOOK');

-- CreateEnum
CREATE TYPE "booking_schema"."LocationType" AS ENUM ('VIDEO', 'IN_PERSON', 'BOTH');

-- CreateEnum
CREATE TYPE "booking_schema"."BookingLocation" AS ENUM ('VIDEO', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "liason_schema"."TouchpointType" AS ENUM ('IN_PERSON_MEETING', 'LINKED_IN', 'FACEBOOK', 'TEXT', 'EMAIL', 'PHONE', 'OTHER');

-- CreateEnum
CREATE TYPE "liason_schema"."MileageRateType" AS ENUM ('FEDERAL', 'STATE');

-- CreateEnum
CREATE TYPE "marketing_schema"."CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "marketing_schema"."BlastStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "marketing_schema"."BlastEditorType" AS ENUM ('DRAG_DROP', 'CLASSIC');

-- CreateEnum
CREATE TYPE "marketing_schema"."SenderKind" AS ENUM ('PERSONAL', 'CUSTOM_DOMAIN');

-- CreateEnum
CREATE TYPE "marketing_schema"."SenderStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "marketing_schema"."PageStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "marketing_schema"."SubscriberStatus" AS ENUM ('SUBSCRIBED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "marketing_schema"."SubscriberSource" AS ENUM ('FORM', 'MANUAL', 'IMPORT', 'BLAST');

-- CreateEnum
CREATE TYPE "marketing_schema"."AudienceType" AS ENUM ('BOARD', 'SUBSCRIBER');

-- CreateEnum
CREATE TYPE "support_schema"."TicketStatus" AS ENUM ('OPEN', 'CLOSED', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "support_schema"."Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "support_schema"."TicketCategory" AS ENUM ('GENERAL', 'TECHNICAL', 'ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "support_schema"."HistoryChangeType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'MESSAGE_SENT', 'PRIORITY_CHANGED', 'CLOSED', 'REOPENED', 'RATED', 'RESOLVED', 'OPEN');

-- CreateEnum
CREATE TYPE "task_schema"."TaskPriority" AS ENUM ('URGENT', 'HIGH', 'NORMAL', 'LOW');

-- CreateEnum
CREATE TYPE "task_schema"."TaskStatusCategory" AS ENUM ('ACTIVE', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "stripe_schema"."TransactionType" AS ENUM ('SUBSCRIPTION', 'SEAT_CHANGE', 'REFUND', 'OTHER');

-- CreateEnum
CREATE TYPE "stripe_schema"."TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "auth_schema"."User" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "banExpires" TIMESTAMPTZ(3),
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "stripeCustomerId" TEXT,
    "twoFactorEnabled" BOOLEAN,
    "isOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "role" TEXT NOT NULL DEFAULT 'user',
    "banReason" TEXT,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "passkeyPromptWaivedAt" TIMESTAMPTZ(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_schema"."TwoFactor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "failedVerificationCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TwoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_schema"."UserAccount" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_schema"."UserOnboarding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hearAbout" TEXT NOT NULL,
    "howToUse" TEXT NOT NULL,
    "whatToExpect" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_schema"."Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3),
    "updatedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_schema"."Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL,
    "metadata" TEXT,
    "stripeCustomerId" TEXT,
    "hipaaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "baaAcceptedAt" TIMESTAMPTZ(3),
    "baaVersion" TEXT,
    "retentionDays" INTEGER NOT NULL DEFAULT 2555,
    "ipAllowlist" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_schema"."OrgIntegration" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "OrgIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_schema"."Member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_schema"."Invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "inviterId" TEXT NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_schema"."AuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "actorOrgId" TEXT,
    "actorRole" TEXT,
    "actorIp" TEXT,
    "actorUserAgent" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "method" TEXT,
    "path" TEXT,
    "statusCode" INTEGER,
    "durationMs" INTEGER,
    "requestId" TEXT,
    "changeHash" TEXT,
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_schema"."AdminActivityLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" TEXT NOT NULL,
    "adminName" TEXT NOT NULL,
    "action" "auth_schema"."AdminAction" NOT NULL,
    "targetUserId" TEXT,
    "targetName" TEXT,
    "targetOrgId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "AdminActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_schema"."Passkey" (
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

    CONSTRAINT "Passkey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_schema"."ContractAgreement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "auth_schema"."AgreementKind" NOT NULL DEFAULT 'BAA',
    "termsVersion" TEXT NOT NULL,
    "acceptanceMethod" "auth_schema"."AcceptanceMethod" NOT NULL DEFAULT 'signature',
    "companyLegalName" TEXT NOT NULL,
    "companyJurisdiction" TEXT NOT NULL,
    "companyEntityType" TEXT NOT NULL,
    "companyAddress" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerTitle" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "signerUserId" TEXT,
    "document" BYTEA,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "note" TEXT,
    "signedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_schema"."Module" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelSingular" TEXT NOT NULL,
    "icon" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "moduleOrder" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_schema"."Field" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldOrder" INTEGER NOT NULL,
    "fieldType" "board_schema"."BoardFieldType" NOT NULL,
    "moduleType" "board_schema"."ModuleType" NOT NULL DEFAULT 'LEAD',
    "moduleId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_schema"."Board" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "recordName" TEXT NOT NULL,
    "assignedTo" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "moduleType" "board_schema"."ModuleType" NOT NULL DEFAULT 'LEAD',
    "moduleId" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_schema"."FieldValue" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT,
    "organizationId" TEXT,

    CONSTRAINT "FieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_schema"."FieldOption" (
    "id" TEXT NOT NULL,
    "optionName" TEXT NOT NULL,
    "color" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "optionOrder" INTEGER NOT NULL DEFAULT 0,
    "stageType" "board_schema"."StageType" NOT NULL DEFAULT 'OPEN',
    "probability" INTEGER,
    "fieldId" TEXT NOT NULL,
    "organizationId" TEXT,

    CONSTRAINT "FieldOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_schema"."History" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "column" TEXT,
    "fieldId" TEXT,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "organizationId" TEXT,

    CONSTRAINT "History_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_schema"."FieldPersonInformation" (
    "id" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "fieldValueId" TEXT NOT NULL,

    CONSTRAINT "FieldPersonInformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_schema"."BoardNotificationState" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "lastSeen" TIMESTAMPTZ(3) NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BoardNotificationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_schema"."BoardCounty" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countyName" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "BoardCounty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_schema"."BoardCountyAssignedTo" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedTo" TEXT NOT NULL,
    "boardCountyId" TEXT NOT NULL,

    CONSTRAINT "BoardCountyAssignedTo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_schema"."Activity" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "activityType" "board_schema"."ActivityType" NOT NULL,
    "status" "board_schema"."ActivityStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "recipientEmail" TEXT,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "emailSentAt" TIMESTAMPTZ(3),
    "senderEmail" TEXT,
    "faxNumber" TEXT,
    "faxId" TEXT,
    "faxSentAt" TIMESTAMPTZ(3),
    "direction" "board_schema"."EmailDirection" NOT NULL DEFAULT 'OUTBOUND',
    "trackingId" TEXT,
    "threadToken" TEXT,
    "messageId" TEXT,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "firstOpenedAt" TIMESTAMPTZ(3),
    "lastOpenedAt" TIMESTAMPTZ(3),
    "recordId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_schema"."EmailOpenEvent" (
    "id" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipHash" TEXT,
    "clientType" TEXT,
    "activityId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "EmailOpenEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_schema"."EmailIngestAddress" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ingestKey" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "EmailIngestAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_schema"."GmailToken" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiry" TIMESTAMPTZ(3) NOT NULL,
    "gmailAddress" TEXT NOT NULL,

    CONSTRAINT "GmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_schema"."OutlookToken" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiry" TIMESTAMPTZ(3) NOT NULL,
    "outlookEmail" TEXT NOT NULL,

    CONSTRAINT "OutlookToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_schema"."BoardRelation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "relationType" "board_schema"."RelationType" NOT NULL DEFAULT 'REFERRAL_LINK',
    "organizationId" TEXT,

    CONSTRAINT "BoardRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_schema"."BookingPage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "locationType" "booking_schema"."LocationType" NOT NULL DEFAULT 'VIDEO',
    "locationLabel" TEXT,
    "preferredProvider" "booking_schema"."CalendarProvider",
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "timezone" TEXT NOT NULL,
    "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
    "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
    "minNoticeHours" INTEGER NOT NULL DEFAULT 4,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BookingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_schema"."AvailabilityRule" (
    "id" TEXT NOT NULL,
    "bookingPageId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,

    CONSTRAINT "AvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_schema"."Booking" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bookingPageId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "boardId" TEXT,
    "inviteeName" TEXT NOT NULL,
    "inviteeEmail" TEXT NOT NULL,
    "inviteeNotes" TEXT,
    "locationType" "booking_schema"."BookingLocation" NOT NULL DEFAULT 'VIDEO',
    "startTime" TIMESTAMPTZ(3) NOT NULL,
    "endTime" TIMESTAMPTZ(3) NOT NULL,
    "status" "booking_schema"."BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "calendarProvider" TEXT,
    "externalEventId" TEXT,
    "calendarSyncFailed" BOOLEAN NOT NULL DEFAULT false,
    "meetingUrl" TEXT,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_schema"."GoogleCalendarToken" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiry" TIMESTAMPTZ(3) NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "GoogleCalendarToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_schema"."OutlookCalendarToken" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiry" TIMESTAMPTZ(3) NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "OutlookCalendarToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liason_schema"."Marketing" (
    "id" TEXT NOT NULL,
    "facility" TEXT NOT NULL,
    "touchpoints" "liason_schema"."TouchpointType"[],
    "talkedTo" TEXT NOT NULL,
    "reasonForVisit" TEXT,
    "notes" TEXT,
    "memberId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Marketing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liason_schema"."Expense" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liason_schema"."Mileage" (
    "id" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "countiesMarketed" TEXT NOT NULL,
    "beginningMileage" DOUBLE PRECISION NOT NULL,
    "endingMileage" DOUBLE PRECISION NOT NULL,
    "totalMiles" DOUBLE PRECISION NOT NULL,
    "rateType" "liason_schema"."MileageRateType" NOT NULL,
    "ratePerMile" DOUBLE PRECISION NOT NULL,
    "reimbursementAmount" DOUBLE PRECISION NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "memberId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Mileage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_schema"."ManualCategory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ManualCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_schema"."ManualArticle" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "readMinutes" INTEGER NOT NULL DEFAULT 3,
    "order" INTEGER NOT NULL DEFAULT 0,
    "categoryId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "ManualArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_schema"."ManualStep" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "articleId" TEXT NOT NULL,

    CONSTRAINT "ManualStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_schema"."Campaign" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "marketing_schema"."CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "senderIdentityId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_schema"."SenderIdentity" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "marketing_schema"."SenderKind" NOT NULL,
    "status" "marketing_schema"."SenderStatus" NOT NULL DEFAULT 'PENDING',
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "domain" TEXT,
    "dnsRecords" JSONB,
    "verifiedAt" TIMESTAMPTZ(3),
    "replyTo" TEXT,
    "mailboxUserId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "SenderIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_schema"."Blast" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyJson" JSONB,
    "editorType" "marketing_schema"."BlastEditorType" NOT NULL DEFAULT 'DRAG_DROP',
    "status" "marketing_schema"."BlastStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMPTZ(3),
    "sentAt" TIMESTAMPTZ(3),
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT,
    "createdBy" TEXT,

    CONSTRAINT "Blast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_schema"."RecipientGroup" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "moduleType" "board_schema"."ModuleType" NOT NULL DEFAULT 'LEAD',
    "moduleId" TEXT,
    "audienceType" "marketing_schema"."AudienceType" NOT NULL DEFAULT 'BOARD',
    "filter" JSONB NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "RecipientGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_schema"."EmailSubscriber" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "email" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "name" TEXT,
    "status" "marketing_schema"."SubscriberStatus" NOT NULL DEFAULT 'SUBSCRIBED',
    "source" "marketing_schema"."SubscriberSource" NOT NULL DEFAULT 'MANUAL',
    "subscribedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMPTZ(3),
    "organizationId" TEXT NOT NULL,
    "recordId" TEXT,

    CONSTRAINT "EmailSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_schema"."BlastGroup" (
    "blastId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "BlastGroup_pkey" PRIMARY KEY ("blastId","groupId")
);

-- CreateTable
CREATE TABLE "marketing_schema"."BlastRecipient" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "trackingId" TEXT,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "firstOpenedAt" TIMESTAMPTZ(3),
    "lastOpenedAt" TIMESTAMPTZ(3),
    "sentAt" TIMESTAMPTZ(3),
    "error" TEXT,
    "blastId" TEXT NOT NULL,
    "recordId" TEXT,
    "subscriberId" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "BlastRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_schema"."Form" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "marketing_schema"."PageStatus" NOT NULL DEFAULT 'DRAFT',
    "moduleType" "board_schema"."ModuleType" NOT NULL DEFAULT 'LEAD',
    "moduleId" TEXT,
    "fieldMappings" JSONB NOT NULL,
    "submitButtonText" TEXT NOT NULL DEFAULT 'Submit',
    "redirectUrl" TEXT,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT,
    "createdBy" TEXT,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_schema"."FormSubmission" (
    "id" TEXT NOT NULL,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceIp" TEXT,
    "userAgent" TEXT,
    "formId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_schema"."LandingPage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "marketing_schema"."PageStatus" NOT NULL DEFAULT 'DRAFT',
    "sections" JSONB NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "publishedAt" TIMESTAMPTZ(3),
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT,
    "formId" TEXT,
    "createdBy" TEXT,

    CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_schema"."Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "actorUserId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_schema"."SavedReport" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "name" TEXT NOT NULL,
    "columnIds" TEXT[],
    "filter" JSONB NOT NULL,
    "rangeDays" INTEGER,
    "moduleId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_schema"."Subscription" (
    "id" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "status" TEXT,
    "periodStart" TIMESTAMPTZ(3),
    "periodEnd" TIMESTAMPTZ(3),
    "cancelAtPeriodEnd" BOOLEAN,
    "seats" INTEGER,
    "trialStart" TIMESTAMPTZ(3),
    "trialEnd" TIMESTAMPTZ(3),
    "cancelAt" TIMESTAMPTZ(3),
    "canceledAt" TIMESTAMPTZ(3),
    "endedAt" TIMESTAMPTZ(3),
    "billingInterval" TEXT,
    "stripeScheduleId" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "contractLabel" TEXT,
    "customPriceCents" INTEGER,
    "setupFeeCents" INTEGER,
    "customLimits" JSONB,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_schema"."WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_schema"."SupportTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL DEFAULT generate_ticket_number(),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "support_schema"."TicketCategory" NOT NULL DEFAULT 'GENERAL',
    "status" "support_schema"."TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "support_schema"."Priority" NOT NULL DEFAULT 'MEDIUM',
    "assignedTo" TEXT NOT NULL,
    "createBy" TEXT NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_schema"."SupportHistory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "changeType" "support_schema"."HistoryChangeType" NOT NULL DEFAULT 'MESSAGE_SENT',
    "sender" TEXT NOT NULL,
    "supportTicketId" TEXT NOT NULL,

    CONSTRAINT "SupportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_schema"."SupportTicketRating" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "supportTicketId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "SupportTicketRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_schema"."SupportTicketMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "message" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "supportTicketId" TEXT NOT NULL,

    CONSTRAINT "SupportTicketMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_schema"."SupportTicketAttachment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "supportTicketMessageId" TEXT NOT NULL,

    CONSTRAINT "SupportTicketAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_schema"."SupportLiveChat" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "message" TEXT NOT NULL,
    "sender" TEXT NOT NULL,

    CONSTRAINT "SupportLiveChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_schema"."SupportLiveChatMessage" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "message" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "supportLiveChatId" TEXT NOT NULL,

    CONSTRAINT "SupportLiveChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_schema"."SupportLiveChatAttachment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "supportLiveChatId" TEXT NOT NULL,

    CONSTRAINT "SupportLiveChatAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_schema"."TaskProject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "taskCounter" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "TaskProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_schema"."TaskList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "TaskList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_schema"."TaskStatus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "category" "task_schema"."TaskStatusCategory" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "TaskStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_schema"."Task" (
    "id" TEXT NOT NULL,
    "taskNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priority" "task_schema"."TaskPriority" NOT NULL DEFAULT 'NORMAL',
    "startDate" TIMESTAMPTZ(3),
    "dueDate" TIMESTAMPTZ(3),
    "estimatedMinutes" INTEGER,
    "trackedMinutes" INTEGER NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL,
    "completedAt" TIMESTAMPTZ(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "statusId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "parentTaskId" TEXT,
    "createdBy" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_schema"."TaskAssignee" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "taskId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "TaskAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_schema"."TaskWatcher" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "taskId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "TaskWatcher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_schema"."TaskChecklistItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isDone" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "taskId" TEXT NOT NULL,

    CONSTRAINT "TaskChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_schema"."TaskComment" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "taskId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_schema"."TaskAttachment" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "taskId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "TaskAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_schema"."TaskLabel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "TaskLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_schema"."TaskLabelPivot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "taskId" TEXT NOT NULL,
    "labelId" TEXT NOT NULL,

    CONSTRAINT "TaskLabelPivot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_schema"."TaskTimeEntry" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "endedAt" TIMESTAMPTZ(3),
    "durationMinutes" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "TaskTimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_schema"."TaskDependency" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "blockerTaskId" TEXT NOT NULL,
    "blockedTaskId" TEXT NOT NULL,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_schema"."TaskActivity" (
    "id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "taskId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,

    CONSTRAINT "TaskActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_schema"."Transaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "memberId" TEXT,
    "type" "stripe_schema"."TransactionType" NOT NULL,
    "status" "stripe_schema"."TransactionStatus" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "description" TEXT NOT NULL,
    "stripeInvoiceId" TEXT,
    "stripeSessionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "auth_schema"."User"("email");

-- CreateIndex
CREATE INDEX "TwoFactor_userId_idx" ON "auth_schema"."TwoFactor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserOnboarding_userId_key" ON "auth_schema"."UserOnboarding"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "auth_schema"."Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "auth_schema"."Organization"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgIntegration_organizationId_provider_key" ON "auth_schema"."OrgIntegration"("organizationId", "provider");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "auth_schema"."AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorOrgId_createdAt_idx" ON "auth_schema"."AuditLog"("actorOrgId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "auth_schema"."AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "auth_schema"."AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "auth_schema"."AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminActivityLog_adminId_createdAt_idx" ON "auth_schema"."AdminActivityLog"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminActivityLog_action_createdAt_idx" ON "auth_schema"."AdminActivityLog"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Passkey_credentialID_key" ON "auth_schema"."Passkey"("credentialID");

-- CreateIndex
CREATE INDEX "Passkey_userId_idx" ON "auth_schema"."Passkey"("userId");

-- CreateIndex
CREATE INDEX "ContractAgreement_organizationId_kind_termsVersion_idx" ON "auth_schema"."ContractAgreement"("organizationId", "kind", "termsVersion");

-- CreateIndex
CREATE INDEX "Module_organizationId_isArchived_moduleOrder_idx" ON "board_schema"."Module"("organizationId", "isArchived", "moduleOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Module_organizationId_key_key" ON "board_schema"."Module"("organizationId", "key");

-- CreateIndex
CREATE INDEX "Field_organizationId_moduleType_isDeleted_fieldOrder_idx" ON "board_schema"."Field"("organizationId", "moduleType", "isDeleted", "fieldOrder");

-- CreateIndex
CREATE INDEX "Field_moduleId_isDeleted_fieldOrder_idx" ON "board_schema"."Field"("moduleId", "isDeleted", "fieldOrder");

-- CreateIndex
CREATE INDEX "Board_organizationId_recordName_idx" ON "board_schema"."Board"("organizationId", "recordName");

-- CreateIndex
CREATE INDEX "Board_organizationId_moduleType_isDeleted_createdAt_idx" ON "board_schema"."Board"("organizationId", "moduleType", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "Board_moduleId_isDeleted_createdAt_idx" ON "board_schema"."Board"("moduleId", "isDeleted", "createdAt");

-- CreateIndex
CREATE INDEX "Board_assignedTo_idx" ON "board_schema"."Board"("assignedTo");

-- CreateIndex
CREATE INDEX "FieldValue_recordId_idx" ON "board_schema"."FieldValue"("recordId");

-- CreateIndex
CREATE INDEX "FieldValue_fieldId_value_idx" ON "board_schema"."FieldValue"("fieldId", "value");

-- CreateIndex
CREATE INDEX "FieldValue_organizationId_idx" ON "board_schema"."FieldValue"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldValue_recordId_fieldId_key" ON "board_schema"."FieldValue"("recordId", "fieldId");

-- CreateIndex
CREATE INDEX "FieldOption_fieldId_idx" ON "board_schema"."FieldOption"("fieldId");

-- CreateIndex
CREATE INDEX "FieldOption_organizationId_idx" ON "board_schema"."FieldOption"("organizationId");

-- CreateIndex
CREATE INDEX "History_recordId_createdAt_idx" ON "board_schema"."History"("recordId", "createdAt");

-- CreateIndex
CREATE INDEX "History_organizationId_idx" ON "board_schema"."History"("organizationId");

-- CreateIndex
CREATE INDEX "History_organizationId_createdAt_idx" ON "board_schema"."History"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "History_fieldId_idx" ON "board_schema"."History"("fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldPersonInformation_fieldValueId_key" ON "board_schema"."FieldPersonInformation"("fieldValueId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardNotificationState_recordId_key" ON "board_schema"."BoardNotificationState"("recordId");

-- CreateIndex
CREATE INDEX "BoardCounty_organizationId_idx" ON "board_schema"."BoardCounty"("organizationId");

-- CreateIndex
CREATE INDEX "BoardCountyAssignedTo_boardCountyId_idx" ON "board_schema"."BoardCountyAssignedTo"("boardCountyId");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_trackingId_key" ON "board_schema"."Activity"("trackingId");

-- CreateIndex
CREATE INDEX "Activity_recordId_idx" ON "board_schema"."Activity"("recordId");

-- CreateIndex
CREATE INDEX "Activity_organizationId_idx" ON "board_schema"."Activity"("organizationId");

-- CreateIndex
CREATE INDEX "Activity_dueDate_idx" ON "board_schema"."Activity"("dueDate");

-- CreateIndex
CREATE INDEX "Activity_threadToken_idx" ON "board_schema"."Activity"("threadToken");

-- CreateIndex
CREATE INDEX "Activity_organizationId_messageId_idx" ON "board_schema"."Activity"("organizationId", "messageId");

-- CreateIndex
CREATE INDEX "EmailOpenEvent_activityId_idx" ON "board_schema"."EmailOpenEvent"("activityId");

-- CreateIndex
CREATE INDEX "EmailOpenEvent_organizationId_idx" ON "board_schema"."EmailOpenEvent"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailIngestAddress_ingestKey_key" ON "board_schema"."EmailIngestAddress"("ingestKey");

-- CreateIndex
CREATE UNIQUE INDEX "EmailIngestAddress_organizationId_key" ON "board_schema"."EmailIngestAddress"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "GmailToken_userId_key" ON "board_schema"."GmailToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OutlookToken_userId_key" ON "board_schema"."OutlookToken"("userId");

-- CreateIndex
CREATE INDEX "BoardRelation_sourceId_idx" ON "board_schema"."BoardRelation"("sourceId");

-- CreateIndex
CREATE INDEX "BoardRelation_targetId_idx" ON "board_schema"."BoardRelation"("targetId");

-- CreateIndex
CREATE INDEX "BoardRelation_organizationId_idx" ON "board_schema"."BoardRelation"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardRelation_sourceId_targetId_relationType_key" ON "board_schema"."BoardRelation"("sourceId", "targetId", "relationType");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPage_slug_key" ON "booking_schema"."BookingPage"("slug");

-- CreateIndex
CREATE INDEX "BookingPage_organizationId_idx" ON "booking_schema"."BookingPage"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingPage_organizationId_userId_key" ON "booking_schema"."BookingPage"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "AvailabilityRule_bookingPageId_dayOfWeek_idx" ON "booking_schema"."AvailabilityRule"("bookingPageId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "Booking_bookingPageId_startTime_idx" ON "booking_schema"."Booking"("bookingPageId", "startTime");

-- CreateIndex
CREATE INDEX "Booking_organizationId_idx" ON "booking_schema"."Booking"("organizationId");

-- CreateIndex
CREATE INDEX "Booking_boardId_idx" ON "booking_schema"."Booking"("boardId");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "booking_schema"."Booking"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarToken_userId_key" ON "calendar_schema"."GoogleCalendarToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OutlookCalendarToken_userId_key" ON "calendar_schema"."OutlookCalendarToken"("userId");

-- CreateIndex
CREATE INDEX "Marketing_memberId_idx" ON "liason_schema"."Marketing"("memberId");

-- CreateIndex
CREATE INDEX "Marketing_organizationId_idx" ON "liason_schema"."Marketing"("organizationId");

-- CreateIndex
CREATE INDEX "Expense_memberId_idx" ON "liason_schema"."Expense"("memberId");

-- CreateIndex
CREATE INDEX "Expense_organizationId_idx" ON "liason_schema"."Expense"("organizationId");

-- CreateIndex
CREATE INDEX "Mileage_memberId_idx" ON "liason_schema"."Mileage"("memberId");

-- CreateIndex
CREATE INDEX "Mileage_organizationId_idx" ON "liason_schema"."Mileage"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ManualCategory_slug_key" ON "support_schema"."ManualCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ManualArticle_slug_key" ON "support_schema"."ManualArticle"("slug");

-- CreateIndex
CREATE INDEX "ManualArticle_categoryId_idx" ON "support_schema"."ManualArticle"("categoryId");

-- CreateIndex
CREATE INDEX "ManualStep_articleId_idx" ON "support_schema"."ManualStep"("articleId");

-- CreateIndex
CREATE INDEX "Campaign_organizationId_status_idx" ON "marketing_schema"."Campaign"("organizationId", "status");

-- CreateIndex
CREATE INDEX "SenderIdentity_organizationId_status_idx" ON "marketing_schema"."SenderIdentity"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SenderIdentity_organizationId_domain_key" ON "marketing_schema"."SenderIdentity"("organizationId", "domain");

-- CreateIndex
CREATE INDEX "Blast_organizationId_status_idx" ON "marketing_schema"."Blast"("organizationId", "status");

-- CreateIndex
CREATE INDEX "RecipientGroup_organizationId_moduleType_idx" ON "marketing_schema"."RecipientGroup"("organizationId", "moduleType");

-- CreateIndex
CREATE INDEX "EmailSubscriber_organizationId_status_idx" ON "marketing_schema"."EmailSubscriber"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSubscriber_organizationId_emailHash_key" ON "marketing_schema"."EmailSubscriber"("organizationId", "emailHash");

-- CreateIndex
CREATE INDEX "BlastGroup_groupId_idx" ON "marketing_schema"."BlastGroup"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "BlastRecipient_trackingId_key" ON "marketing_schema"."BlastRecipient"("trackingId");

-- CreateIndex
CREATE INDEX "BlastRecipient_organizationId_idx" ON "marketing_schema"."BlastRecipient"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "BlastRecipient_blastId_recordId_key" ON "marketing_schema"."BlastRecipient"("blastId", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "BlastRecipient_blastId_subscriberId_key" ON "marketing_schema"."BlastRecipient"("blastId", "subscriberId");

-- CreateIndex
CREATE UNIQUE INDEX "Form_slug_key" ON "marketing_schema"."Form"("slug");

-- CreateIndex
CREATE INDEX "Form_organizationId_status_idx" ON "marketing_schema"."Form"("organizationId", "status");

-- CreateIndex
CREATE INDEX "FormSubmission_formId_idx" ON "marketing_schema"."FormSubmission"("formId");

-- CreateIndex
CREATE INDEX "FormSubmission_organizationId_idx" ON "marketing_schema"."FormSubmission"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "LandingPage_slug_key" ON "marketing_schema"."LandingPage"("slug");

-- CreateIndex
CREATE INDEX "LandingPage_organizationId_status_idx" ON "marketing_schema"."LandingPage"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Notification_organizationId_recipientId_readAt_createdAt_idx" ON "notification_schema"."Notification"("organizationId", "recipientId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_entityType_entityId_idx" ON "notification_schema"."Notification"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "SavedReport_organizationId_moduleId_idx" ON "board_schema"."SavedReport"("organizationId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "stripe_schema"."Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "stripe_schema"."WebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicket_ticketNumber_key" ON "support_schema"."SupportTicket"("ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicketRating_supportTicketId_key" ON "support_schema"."SupportTicketRating"("supportTicketId");

-- CreateIndex
CREATE INDEX "TaskProject_organizationId_isDeleted_isArchived_idx" ON "task_schema"."TaskProject"("organizationId", "isDeleted", "isArchived");

-- CreateIndex
CREATE INDEX "TaskList_projectId_isDeleted_idx" ON "task_schema"."TaskList"("projectId", "isDeleted");

-- CreateIndex
CREATE INDEX "TaskList_organizationId_idx" ON "task_schema"."TaskList"("organizationId");

-- CreateIndex
CREATE INDEX "TaskStatus_organizationId_idx" ON "task_schema"."TaskStatus"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskStatus_organizationId_name_key" ON "task_schema"."TaskStatus"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Task_organizationId_listId_isDeleted_isArchived_idx" ON "task_schema"."Task"("organizationId", "listId", "isDeleted", "isArchived");

-- CreateIndex
CREATE INDEX "Task_organizationId_statusId_idx" ON "task_schema"."Task"("organizationId", "statusId");

-- CreateIndex
CREATE INDEX "Task_parentTaskId_idx" ON "task_schema"."Task"("parentTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_projectId_taskNumber_key" ON "task_schema"."Task"("projectId", "taskNumber");

-- CreateIndex
CREATE INDEX "TaskAssignee_memberId_idx" ON "task_schema"."TaskAssignee"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskAssignee_taskId_memberId_key" ON "task_schema"."TaskAssignee"("taskId", "memberId");

-- CreateIndex
CREATE INDEX "TaskWatcher_memberId_idx" ON "task_schema"."TaskWatcher"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskWatcher_taskId_memberId_key" ON "task_schema"."TaskWatcher"("taskId", "memberId");

-- CreateIndex
CREATE INDEX "TaskChecklistItem_taskId_idx" ON "task_schema"."TaskChecklistItem"("taskId");

-- CreateIndex
CREATE INDEX "TaskComment_taskId_idx" ON "task_schema"."TaskComment"("taskId");

-- CreateIndex
CREATE INDEX "TaskAttachment_taskId_idx" ON "task_schema"."TaskAttachment"("taskId");

-- CreateIndex
CREATE INDEX "TaskLabel_organizationId_idx" ON "task_schema"."TaskLabel"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskLabel_organizationId_name_key" ON "task_schema"."TaskLabel"("organizationId", "name");

-- CreateIndex
CREATE INDEX "TaskLabelPivot_labelId_idx" ON "task_schema"."TaskLabelPivot"("labelId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskLabelPivot_taskId_labelId_key" ON "task_schema"."TaskLabelPivot"("taskId", "labelId");

-- CreateIndex
CREATE INDEX "TaskTimeEntry_organizationId_userId_endedAt_idx" ON "task_schema"."TaskTimeEntry"("organizationId", "userId", "endedAt");

-- CreateIndex
CREATE INDEX "TaskTimeEntry_taskId_idx" ON "task_schema"."TaskTimeEntry"("taskId");

-- CreateIndex
CREATE INDEX "TaskDependency_blockedTaskId_idx" ON "task_schema"."TaskDependency"("blockedTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_blockerTaskId_blockedTaskId_key" ON "task_schema"."TaskDependency"("blockerTaskId", "blockedTaskId");

-- CreateIndex
CREATE INDEX "TaskActivity_taskId_createdAt_idx" ON "task_schema"."TaskActivity"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_organizationId_createdAt_idx" ON "stripe_schema"."Transaction"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_memberId_idx" ON "stripe_schema"."Transaction"("memberId");

-- CreateIndex
CREATE INDEX "Transaction_type_status_idx" ON "stripe_schema"."Transaction"("type", "status");

-- CreateIndex
CREATE INDEX "Transaction_stripeInvoiceId_idx" ON "stripe_schema"."Transaction"("stripeInvoiceId");

-- AddForeignKey
ALTER TABLE "auth_schema"."TwoFactor" ADD CONSTRAINT "TwoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_schema"."UserAccount" ADD CONSTRAINT "UserAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_schema"."UserOnboarding" ADD CONSTRAINT "UserOnboarding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_schema"."OrgIntegration" ADD CONSTRAINT "OrgIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_schema"."Member" ADD CONSTRAINT "Member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_schema"."Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_schema"."Invitation" ADD CONSTRAINT "Invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_schema"."Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_schema"."Passkey" ADD CONSTRAINT "Passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_schema"."ContractAgreement" ADD CONSTRAINT "ContractAgreement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."Module" ADD CONSTRAINT "Module_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."Field" ADD CONSTRAINT "Field_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."Field" ADD CONSTRAINT "Field_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "board_schema"."Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."Board" ADD CONSTRAINT "Board_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."Board" ADD CONSTRAINT "Board_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "auth_schema"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."Board" ADD CONSTRAINT "Board_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "board_schema"."Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."FieldValue" ADD CONSTRAINT "FieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "board_schema"."Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."FieldValue" ADD CONSTRAINT "FieldValue_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "board_schema"."Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."FieldOption" ADD CONSTRAINT "FieldOption_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "board_schema"."Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."History" ADD CONSTRAINT "History_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "board_schema"."Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."History" ADD CONSTRAINT "History_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth_schema"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."History" ADD CONSTRAINT "History_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "board_schema"."Field"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."FieldPersonInformation" ADD CONSTRAINT "FieldPersonInformation_fieldValueId_fkey" FOREIGN KEY ("fieldValueId") REFERENCES "board_schema"."FieldValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."BoardNotificationState" ADD CONSTRAINT "BoardNotificationState_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "board_schema"."Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."BoardCounty" ADD CONSTRAINT "BoardCounty_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."BoardCountyAssignedTo" ADD CONSTRAINT "BoardCountyAssignedTo_boardCountyId_fkey" FOREIGN KEY ("boardCountyId") REFERENCES "board_schema"."BoardCounty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."Activity" ADD CONSTRAINT "Activity_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "board_schema"."Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."Activity" ADD CONSTRAINT "Activity_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth_schema"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."Activity" ADD CONSTRAINT "Activity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."EmailOpenEvent" ADD CONSTRAINT "EmailOpenEvent_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "board_schema"."Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."EmailOpenEvent" ADD CONSTRAINT "EmailOpenEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."EmailIngestAddress" ADD CONSTRAINT "EmailIngestAddress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."GmailToken" ADD CONSTRAINT "GmailToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."OutlookToken" ADD CONSTRAINT "OutlookToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."BoardRelation" ADD CONSTRAINT "BoardRelation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "board_schema"."Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."BoardRelation" ADD CONSTRAINT "BoardRelation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "board_schema"."Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_schema"."BookingPage" ADD CONSTRAINT "BookingPage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_schema"."AvailabilityRule" ADD CONSTRAINT "AvailabilityRule_bookingPageId_fkey" FOREIGN KEY ("bookingPageId") REFERENCES "booking_schema"."BookingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_schema"."Booking" ADD CONSTRAINT "Booking_bookingPageId_fkey" FOREIGN KEY ("bookingPageId") REFERENCES "booking_schema"."BookingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_schema"."Booking" ADD CONSTRAINT "Booking_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "board_schema"."Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_schema"."GoogleCalendarToken" ADD CONSTRAINT "GoogleCalendarToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_schema"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_schema"."OutlookCalendarToken" ADD CONSTRAINT "OutlookCalendarToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_schema"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liason_schema"."Marketing" ADD CONSTRAINT "Marketing_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "auth_schema"."Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liason_schema"."Marketing" ADD CONSTRAINT "Marketing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liason_schema"."Expense" ADD CONSTRAINT "Expense_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "auth_schema"."Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liason_schema"."Expense" ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liason_schema"."Mileage" ADD CONSTRAINT "Mileage_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "auth_schema"."Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liason_schema"."Mileage" ADD CONSTRAINT "Mileage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_schema"."ManualArticle" ADD CONSTRAINT "ManualArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "support_schema"."ManualCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_schema"."ManualArticle" ADD CONSTRAINT "ManualArticle_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth_schema"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_schema"."ManualStep" ADD CONSTRAINT "ManualStep_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "support_schema"."ManualArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."Campaign" ADD CONSTRAINT "Campaign_senderIdentityId_fkey" FOREIGN KEY ("senderIdentityId") REFERENCES "marketing_schema"."SenderIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."Campaign" ADD CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."Campaign" ADD CONSTRAINT "Campaign_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth_schema"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."SenderIdentity" ADD CONSTRAINT "SenderIdentity_mailboxUserId_fkey" FOREIGN KEY ("mailboxUserId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."SenderIdentity" ADD CONSTRAINT "SenderIdentity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."SenderIdentity" ADD CONSTRAINT "SenderIdentity_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth_schema"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."Blast" ADD CONSTRAINT "Blast_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."Blast" ADD CONSTRAINT "Blast_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "marketing_schema"."Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."Blast" ADD CONSTRAINT "Blast_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth_schema"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."RecipientGroup" ADD CONSTRAINT "RecipientGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."RecipientGroup" ADD CONSTRAINT "RecipientGroup_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "board_schema"."Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."RecipientGroup" ADD CONSTRAINT "RecipientGroup_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth_schema"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."EmailSubscriber" ADD CONSTRAINT "EmailSubscriber_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."EmailSubscriber" ADD CONSTRAINT "EmailSubscriber_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "board_schema"."Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."BlastGroup" ADD CONSTRAINT "BlastGroup_blastId_fkey" FOREIGN KEY ("blastId") REFERENCES "marketing_schema"."Blast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."BlastGroup" ADD CONSTRAINT "BlastGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "marketing_schema"."RecipientGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."BlastRecipient" ADD CONSTRAINT "BlastRecipient_blastId_fkey" FOREIGN KEY ("blastId") REFERENCES "marketing_schema"."Blast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."BlastRecipient" ADD CONSTRAINT "BlastRecipient_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "board_schema"."Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."BlastRecipient" ADD CONSTRAINT "BlastRecipient_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "marketing_schema"."EmailSubscriber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."BlastRecipient" ADD CONSTRAINT "BlastRecipient_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."Form" ADD CONSTRAINT "Form_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."Form" ADD CONSTRAINT "Form_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "board_schema"."Module"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."Form" ADD CONSTRAINT "Form_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "marketing_schema"."Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."Form" ADD CONSTRAINT "Form_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth_schema"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "marketing_schema"."Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."FormSubmission" ADD CONSTRAINT "FormSubmission_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "board_schema"."Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."FormSubmission" ADD CONSTRAINT "FormSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."LandingPage" ADD CONSTRAINT "LandingPage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."LandingPage" ADD CONSTRAINT "LandingPage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "marketing_schema"."Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."LandingPage" ADD CONSTRAINT "LandingPage_formId_fkey" FOREIGN KEY ("formId") REFERENCES "marketing_schema"."Form"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_schema"."LandingPage" ADD CONSTRAINT "LandingPage_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth_schema"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_schema"."Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_schema"."Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "auth_schema"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_schema"."Notification" ADD CONSTRAINT "Notification_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "auth_schema"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."SavedReport" ADD CONSTRAINT "SavedReport_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "board_schema"."Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."SavedReport" ADD CONSTRAINT "SavedReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."SavedReport" ADD CONSTRAINT "SavedReport_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth_schema"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_schema"."SupportTicket" ADD CONSTRAINT "SupportTicket_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "auth_schema"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_schema"."SupportTicket" ADD CONSTRAINT "SupportTicket_createBy_fkey" FOREIGN KEY ("createBy") REFERENCES "auth_schema"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_schema"."SupportHistory" ADD CONSTRAINT "SupportHistory_sender_fkey" FOREIGN KEY ("sender") REFERENCES "auth_schema"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_schema"."SupportHistory" ADD CONSTRAINT "SupportHistory_supportTicketId_fkey" FOREIGN KEY ("supportTicketId") REFERENCES "support_schema"."SupportTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_schema"."SupportTicketRating" ADD CONSTRAINT "SupportTicketRating_supportTicketId_fkey" FOREIGN KEY ("supportTicketId") REFERENCES "support_schema"."SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_schema"."SupportTicketRating" ADD CONSTRAINT "SupportTicketRating_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth_schema"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_schema"."SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_sender_fkey" FOREIGN KEY ("sender") REFERENCES "auth_schema"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_schema"."SupportTicketMessage" ADD CONSTRAINT "SupportTicketMessage_supportTicketId_fkey" FOREIGN KEY ("supportTicketId") REFERENCES "support_schema"."SupportTicket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_schema"."SupportTicketAttachment" ADD CONSTRAINT "SupportTicketAttachment_supportTicketMessageId_fkey" FOREIGN KEY ("supportTicketMessageId") REFERENCES "support_schema"."SupportTicketMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_schema"."SupportLiveChat" ADD CONSTRAINT "SupportLiveChat_sender_fkey" FOREIGN KEY ("sender") REFERENCES "auth_schema"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_schema"."SupportLiveChatMessage" ADD CONSTRAINT "SupportLiveChatMessage_sender_fkey" FOREIGN KEY ("sender") REFERENCES "auth_schema"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_schema"."SupportLiveChatMessage" ADD CONSTRAINT "SupportLiveChatMessage_supportLiveChatId_fkey" FOREIGN KEY ("supportLiveChatId") REFERENCES "support_schema"."SupportLiveChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_schema"."SupportLiveChatAttachment" ADD CONSTRAINT "SupportLiveChatAttachment_sender_fkey" FOREIGN KEY ("sender") REFERENCES "auth_schema"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_schema"."SupportLiveChatAttachment" ADD CONSTRAINT "SupportLiveChatAttachment_supportLiveChatId_fkey" FOREIGN KEY ("supportLiveChatId") REFERENCES "support_schema"."SupportLiveChat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskProject" ADD CONSTRAINT "TaskProject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskList" ADD CONSTRAINT "TaskList_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "task_schema"."TaskProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskList" ADD CONSTRAINT "TaskList_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskStatus" ADD CONSTRAINT "TaskStatus_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."Task" ADD CONSTRAINT "Task_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "task_schema"."TaskStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "task_schema"."TaskProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."Task" ADD CONSTRAINT "Task_listId_fkey" FOREIGN KEY ("listId") REFERENCES "task_schema"."TaskList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."Task" ADD CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "task_schema"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."Task" ADD CONSTRAINT "Task_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskAssignee" ADD CONSTRAINT "TaskAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task_schema"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskAssignee" ADD CONSTRAINT "TaskAssignee_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "auth_schema"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskWatcher" ADD CONSTRAINT "TaskWatcher_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task_schema"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskWatcher" ADD CONSTRAINT "TaskWatcher_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "auth_schema"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskChecklistItem" ADD CONSTRAINT "TaskChecklistItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task_schema"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task_schema"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskComment" ADD CONSTRAINT "TaskComment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "auth_schema"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskAttachment" ADD CONSTRAINT "TaskAttachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task_schema"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskAttachment" ADD CONSTRAINT "TaskAttachment_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskLabel" ADD CONSTRAINT "TaskLabel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskLabelPivot" ADD CONSTRAINT "TaskLabelPivot_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task_schema"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskLabelPivot" ADD CONSTRAINT "TaskLabelPivot_labelId_fkey" FOREIGN KEY ("labelId") REFERENCES "task_schema"."TaskLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskTimeEntry" ADD CONSTRAINT "TaskTimeEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task_schema"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskTimeEntry" ADD CONSTRAINT "TaskTimeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskTimeEntry" ADD CONSTRAINT "TaskTimeEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskDependency" ADD CONSTRAINT "TaskDependency_blockerTaskId_fkey" FOREIGN KEY ("blockerTaskId") REFERENCES "task_schema"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskDependency" ADD CONSTRAINT "TaskDependency_blockedTaskId_fkey" FOREIGN KEY ("blockedTaskId") REFERENCES "task_schema"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskActivity" ADD CONSTRAINT "TaskActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "task_schema"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schema"."TaskActivity" ADD CONSTRAINT "TaskActivity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "auth_schema"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
