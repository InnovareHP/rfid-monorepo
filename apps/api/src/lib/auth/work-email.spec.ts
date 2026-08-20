import { emailDomain, isConsumerEmailDomain } from "@dashboard/shared";

// Guards membership in a HIPAA-mode organization, so a false negative here lets
// PHI reach a mailbox no BAA covers.
describe("isConsumerEmailDomain", () => {
  it.each([
    "someone@gmail.com",
    "someone@outlook.com",
    "someone@yahoo.co.uk",
    "someone@icloud.com",
    "someone@proton.me",
  ])("rejects %s", (email) => {
    expect(isConsumerEmailDomain(email)).toBe(true);
  });

  it.each([
    "nurse@acmehealth.com",
    "nurse@acme-health.org",
    "nurse@mail.acmehealth.com",
    "nurse@gmail.acmehealth.com",
  ])("admits %s", (email) => {
    expect(isConsumerEmailDomain(email)).toBe(false);
  });

  it("ignores case and surrounding space", () => {
    expect(isConsumerEmailDomain("  Someone@GMAIL.com ")).toBe(true);
  });

  // A domain that merely contains a consumer name is a different domain, and
  // treating it as one would lock a legitimate customer out.
  it("matches the whole domain rather than a substring", () => {
    expect(isConsumerEmailDomain("nurse@notgmail.com")).toBe(false);
    expect(isConsumerEmailDomain("nurse@gmail.com.co")).toBe(false);
  });

  it("treats a malformed address as not consumer, leaving format to the schema", () => {
    expect(isConsumerEmailDomain("no-at-sign")).toBe(false);
    expect(emailDomain("no-at-sign")).toBe("");
  });
});
