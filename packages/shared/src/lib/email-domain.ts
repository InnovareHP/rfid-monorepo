// An organization under a BAA has promised that PHI stays inside systems the
// agreement covers. A consumer mailbox is not one of those: nobody has signed
// anything about it, and the mailbox outlives the person's employment. So an
// organization on a HIPAA-capable plan is limited to addresses on a work
// domain, whether or not it has switched HIPAA mode on yet: the plan is what
// decides, because the mailboxes members already hold are the ones the BAA
// would cover the moment it is signed.
//
// This is a deny list rather than an allow list on purpose. An allow list would
// have to know every customer's domain, and getting that wrong locks an owner
// out of their own organization.
export const CONSUMER_EMAIL_DOMAINS = new Set([
  "aol.com",
  "comcast.net",
  "fastmail.com",
  "gmail.com",
  "gmx.com",
  "googlemail.com",
  "hotmail.co.uk",
  "hotmail.com",
  "icloud.com",
  "inbox.com",
  "live.co.uk",
  "live.com",
  "mac.com",
  "mail.com",
  "me.com",
  "msn.com",
  "outlook.com",
  "pm.me",
  "proton.me",
  "protonmail.com",
  "rocketmail.com",
  "sbcglobal.net",
  "verizon.net",
  "yahoo.co.uk",
  "yahoo.com",
  "ymail.com",
  "zoho.com",
]);

export const emailDomain = (email: string) =>
  email.trim().toLowerCase().split("@")[1] ?? "";

export const isConsumerEmailDomain = (email: string) =>
  CONSUMER_EMAIL_DOMAINS.has(emailDomain(email));

export const WORK_EMAIL_REQUIRED_MESSAGE =
  "This organization is on a HIPAA plan, so members must use a work email address. Personal mailboxes such as Gmail or Outlook.com are not covered by the BAA.";
