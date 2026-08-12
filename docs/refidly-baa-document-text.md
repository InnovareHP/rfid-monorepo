# HIPAA Business Associate Addendum — full text (Refidly)

Reference copy of the document Refidly renders for signing. Unlike Eldon, the PDF is not a
static file: it is generated at request time from `BAA_SECTIONS` in
`packages/shared/src/lib/baa.ts`, so that file is authoritative and this one is the readable
mirror. Structure follows `docs/baa-document-text.md` (Eldon), with Refidly's own service
description, safeguards, and plan conditions.

`BAA_VERSION = "2026-08-11"`. Blank render is 4 pages; an executed copy adds an execution page.

---

## HIPAA Business Associate Addendum

This HIPAA Business Associate Addendum (this "Addendum") is made as of the date an authorized
signer completes electronic signature through Refidly's in-product signing flow (the "Effective
Date"), by and between [______________________________], a(n) [_______________] [corporation /
limited liability company / other] having its principal offices at
[_____________________________________] ("Customer" or "Covered Entity"), and Refidly, a product of
InnovareHP ("Refidly" or "Business Associate"). This Addendum is expressly made part of, and
incorporated into, the Refidly Customer Agreement between the parties (the "Agreement"), and
applies only where Customer subscribes to a plan for which Refidly offers a BAA.

### Background

A. Customer is a Covered Entity, or is a Business Associate to a Covered Entity, and wishes to
create, receive, maintain, or exchange Protected Health Information through the Service.

B. Refidly creates, receives, maintains, and transmits PHI on Customer's behalf in a manner that
makes Refidly a Business Associate under HIPAA rather than a transmission-only conduit, and the
parties agree Refidly will perform, and be bound by, the full obligations of a Business Associate
set out in this Addendum.

C. The purpose of this Addendum is to satisfy the applicable standards and requirements of HIPAA,
the HITECH Act, and the HIPAA Regulations with respect to the Service.

### 1. Definitions

Terms used but not otherwise defined carry the meanings given in HIPAA, the HITECH Act, or the
HIPAA Regulations. Defined terms cover Breach (45 C.F.R. § 164.402), the Breach Notification Rule,
Business Associate and Covered Entity (§ 160.103), Data Aggregation and Designated Record Set
(§ 164.501), De-Identify (§ 164.514(a)-(b)), Disclosure, Electronic PHI, HIPAA and the HITECH Act,
Individual, the Privacy and Security Rules, PHI, Security Incident, Subcontractor, and Unsecured
PHI.

"Service" is defined against what Refidly actually does: referral and facility records, custom
fields, notes and attachments, field activity logs, calendar and booking tools, outreach and fax
delivery, analytics, exports, and AI-assisted features.

### 2. Obligations and Activities of Business Associate

Refidly will not use or disclose PHI other than as permitted; will apply administrative, physical,
and technical safeguards and comply with the Security Rule; and will maintain the specific
safeguards the product implements — encryption in transit and at rest, access scoped to the
customer's own organization, unique user identification, a second authentication factor for PHI
access, optional network allowlisting under the customer's control, and audit logging of record
changes.

Reporting: any security incident, impermissible use or disclosure, and Breach of Unsecured PHI, in
accordance with the Breach Notification Rule, without unreasonable delay and no later than **60
calendar days** after discovery, with affected individuals, nature, PHI involved, and corrective
steps; unsuccessful access attempts reported in aggregate on request.

Also: subcontractor flow-down in writing (hosting, storage, fax delivery, AI processing);
Designated Record Set access within 10 business days so the customer can answer an access request
under § 164.524; amendment under § 164.526; accounting under § 164.528, plus forwarding to the customer
any request an Individual makes directly to Refidly; records available to the Secretary;
mitigation of known harmful effects.

### 3. Permitted Uses and Disclosures by Business Associate

Four permitted uses, lettered (a) through (d): performance of the Service; Refidly's proper
management and administration or legal responsibilities, where any third-party disclosure is
either required by law or subject to reasonable assurances of confidentiality, of limited further
use, and of prompt notification of any breach of confidentiality; Data Aggregation on request; and
De-Identification under § 164.514, after which the result is no longer PHI. Minimum necessary
applies. No sale of PHI and no marketing use without written authorization.

Product-specific: AI features transmit workspace content to an AI subprocessor only when a user
triggers them, processing is transient and organization-scoped, and no workspace content trains any
model. Outreach email leaves through the mailbox the customer's user connects, under the customer's
own sending identity.

### 4. Obligations of Covered Entity

Minimum necessary PHI, notice of privacy-practice limitations and authorization changes, and no
requests that would be impermissible if done by the customer directly.

Product-specific: the customer configures its own custom fields and is responsible for what they
hold; PHI must not be placed in the Service before the Addendum is in effect; the customer
provisions its own users and assigns their roles; the customer owns the content, recipients, and
consent basis of outreach and fax it sends; the customer selects its own retention period.

### 5. Term and Termination

**5.1 Conditions to validity** — signature completed, and an active subscription to a plan for
which Refidly offers a BAA. Signed-in-anticipation does not take effect until both hold.

**5.2 Term coextensive with billing cycle** — runs with the current billing cycle and renews
automatically on timely renewal payment, without a new signature.

**5.3 Automatic lapse** — plan changed to a non-BAA plan, Agreement cancelled, or suspension for
non-payment after notice. A lapse does not terminate the Agreement, but PHI may not be placed or
processed while lapsed.

**5.4 Overall term and breach** — effective from the Effective Date until the Agreement terminates
or all PHI is returned or destroyed, whichever is later. Material breach carries a 30-day cure
period before termination for cause.

### 6. Effect of Termination

Return or destroy at the customer's election, with the standard infeasibility carve-out extending
the Addendum's protections to anything retained, plus retention within backups and audit records
until they expire under the applicable schedule. Destruction renders PHI unreadable and
unreconstructable.

### 7. Indemnification and Liability

Refidly indemnifies for its own failure to perform as Business Associate, including a Breach caused
by failure to implement Section 2 safeguards, and that obligation is not subject to the Agreement's
general liability cap where such a limit would be unenforceable. The customer indemnifies for PHI
placed in the Service outside the Addendum's scope, including on a plan with no executed BAA.

### 8. Miscellaneous

Amendment for continued HIPAA compliance; interpretation resolved toward compliance, with a
reference to a section of HIPAA meaning that section as in effect or as amended; no third-party
beneficiaries; survival of return, destruction, protection, and pre-termination indemnity; this
Addendum controls over the Agreement as to PHI; governed by the law of the customer's jurisdiction
of formation.

### Signatures

Electronic signature through the in-product flow satisfies E-SIGN and UETA. Execution occurs when
an authorized signer for the customer completes that flow against Refidly's countersignature. The
signed PDF and the signing record — signer name, title, email, network address, timestamp — are the
authoritative record of acceptance.

---

## How the app uses this document

| File | Role |
| --- | --- |
| `packages/shared/src/lib/baa.ts` | Authoritative text: `BAA_SECTIONS`, `BAA_CLAUSES`, `BAA_VERSION`, vendor names, acknowledgement, preamble builder. |
| `apps/api/src/lib/documents/baa-pdf.ts` | Renders the blank and executed PDFs from those sections, stamps signature and signing record. |
| `apps/api/src/api/compliance/compliance.service.ts` | Signing endpoint, `ContractAgreement` row, organization stamp, audit entry. |
| `apps/api/src/guard/hipaa/hipaa.guard.ts` | Gates PHI routes on a current BAA version, allowlist, and second factor. |
| `apps/fe/src/components/compliance/baa-sign-modal.tsx` | In-product signing flow. |

`docs/Refidly_HIPAA_Business_Associate_Addendum_2026-08-11_InnovareHP.docx` is a third artifact:
the same addendum as a Word file, carrying the version stamp in its title block and an added
execution block for offline signing (customer party details, both signers, and the electronic
signing record). It was reconciled against `BAA_SECTIONS` on 11 August 2026. It is hand-maintained,
so any edit to `baa.ts` has to be mirrored there or the two will disagree about what was signed.

Differences from Eldon's setup worth knowing: Refidly generates the PDF rather than stamping a
static file, so there is no drift between the document and the summary — both come from one file.
Breach reporting is 60 days here against Eldon's 10 business days; that is a deliberate policy
choice, not drift.

Not legal advice. Re-review party names, the plan-tier condition, and the Customer Agreement
cross-references before this is executed with a customer.
