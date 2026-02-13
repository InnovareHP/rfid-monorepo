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
