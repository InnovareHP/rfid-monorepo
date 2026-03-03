CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT AS $$
DECLARE
  seq INT;
BEGIN
  SELECT nextval('support_schema.ticket_seq') INTO seq;

  RETURN 'TCK-' || to_char(now(), 'YYYY') || '-' || lpad(seq::text, 6, '0');
END;
$$ LANGUAGE plpgsql;


CREATE SEQUENCE support_schema.ticket_seq
START 1;


-- update every table in the schema when needed
CREATE PUBLICATION my_publication_sg FOR TABLE
  -- auth_schema
  auth_schema."User",
  auth_schema."UserAccount",
  auth_schema."UserOnboarding",
  auth_schema."Verification",
  auth_schema."Organization",
  auth_schema."Member",
  auth_schema."Invitation",

  -- stripe_schema
  stripe_schema."Subscription",
  stripe_schema."Plan",

  -- liason_schema
  liason_schema."Marketing",
  liason_schema."Expense",
  liason_schema."Mileage",

  -- board_schema
  board_schema."Field",
  board_schema."Board",
  board_schema."FieldValue",
  board_schema."FieldOption",
  board_schema."History",
  board_schema."BoardNotificationState",
  board_schema."BoardCounty",
  board_schema."BoardCountyAssignedTo",
  board_schema."Activity",
  board_schema."GmailToken",
  board_schema."OutlookToken",

  -- auth_schema (additional)
  auth_schema."AdminActivityLog",

  -- support_schema
  support_schema."SupportTicket",
  support_schema."SupportHistory",
  support_schema."SupportTicketRating",
  support_schema."SupportTicketMessage",
  support_schema."SupportTicketAttachment",
  support_schema."SupportLiveChat",
  support_schema."SupportLiveChatMessage",
  support_schema."SupportLiveChatAttachment";

-- alter publication to add new tables (run this if publication already exists)
ALTER PUBLICATION my_publication_sg ADD TABLE
  board_schema."Activity",
  board_schema."GmailToken",
  board_schema."OutlookToken",
  auth_schema."AdminActivityLog";

  -- to connect to the subscription

CREATE SUBSCRIPTION my_subscription
CONNECTION 'postgresql://neondb_owner:<password>@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
PUBLICATION my_publication;


