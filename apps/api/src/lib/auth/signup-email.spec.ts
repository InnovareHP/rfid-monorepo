import {
  canonicalSignupEmail,
  isDisposableEmailDomain,
} from "@dashboard/shared";

// One inbox must resolve to one account, or every alias of it is another free
// trial. A false collapse is worse: it sends the code to someone else's mailbox.
describe("canonicalSignupEmail", () => {
  it.each([
    ["First.Last+trial@gmail.com", "firstlast@gmail.com"],
    ["f.i.r.s.t@googlemail.com", "first@gmail.com"],
    ["  First@Gmail.com ", "first@gmail.com"],
  ])("collapses gmail alias %s", (input, expected) => {
    expect(canonicalSignupEmail(input)).toBe(expected);
  });

  it.each([
    ["someone+two@outlook.com", "someone@outlook.com"],
    ["some.one@outlook.com", "some.one@outlook.com"],
  ])("strips tags but keeps dots on %s", (input, expected) => {
    expect(canonicalSignupEmail(input)).toBe(expected);
  });

  // Plus addressing is not universal on a work domain, so rewriting one would
  // mail the code to an address that does not exist.
  it.each([
    ["First.Last@acmehealth.com", "first.last@acmehealth.com"],
    ["billing+ap@acmehealth.com", "billing+ap@acmehealth.com"],
  ])("leaves work address %s alone", (input, expected) => {
    expect(canonicalSignupEmail(input)).toBe(expected);
  });

  it("leaves a malformed address to the schema", () => {
    expect(canonicalSignupEmail("no-at-sign")).toBe("no-at-sign");
  });
});

describe("isDisposableEmailDomain", () => {
  it("rejects a throwaway mailbox", () => {
    expect(isDisposableEmailDomain("someone@mailinator.com")).toBe(true);
  });

  it("admits a real domain that merely contains one", () => {
    expect(isDisposableEmailDomain("nurse@notmailinator.com")).toBe(false);
  });
});
