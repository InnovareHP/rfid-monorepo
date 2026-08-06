// The Business Associate Agreement, versioned. Bumping BAA_VERSION makes every
// HIPAA organization re-sign before PHI routes open again, so treat it as a
// release action rather than an edit. The clause list is an on-screen summary;
// BAA_SECTIONS is the agreement the signer actually executes.

export const BAA_VERSION = "2026-08-06";

export const BAA_KIND = "BAA" as const;

export const VENDOR_LEGAL_NAME = "InnovareHP, Inc.";

export const VENDOR_SIGNATORY = {
  name: "InnovareHP, Inc.",
  title: "Authorized Signatory",
} as const;

export const BAA_ENTITY_TYPES = [
  "Corporation",
  "S Corporation",
  "Limited Liability Company",
  "Professional Corporation",
  "Professional Limited Liability Company",
  "Partnership",
  "Limited Partnership",
  "Sole Proprietorship",
  "Non-Profit Corporation",
  "Other",
] as const;

export type BaaEntityType = (typeof BAA_ENTITY_TYPES)[number];

export type BaaParty = {
  companyLegalName: string;
  companyJurisdiction: string;
  companyEntityType: string;
  companyAddress: string;
};

export const BAA_ACKNOWLEDGEMENT =
  "I have read the Business Associate Agreement in full, I am authorized to " +
  "bind the organization named above, and I agree to its terms on the " +
  "organization's behalf. I understand this electronic signature has the same " +
  "legal effect as a handwritten one.";

// Summaries only. The signer reads the full document; these exist so the modal
// can show what is being agreed to without rendering six pages inline.
export const BAA_CLAUSES = [
  "Defined terms carry the meaning given to them in HIPAA and the HITECH Act.",
  "Protected Health Information is used and disclosed only as this agreement permits or law requires.",
  "PHI is never used or disclosed in a way that would violate HIPAA if done by the covered entity itself.",
  "Appropriate administrative, physical and technical safeguards protect PHI, including encryption at rest and in transit.",
  "Subcontractors that receive PHI are bound by written terms no less protective than these.",
  "Security incidents and breaches of unsecured PHI are reported without unreasonable delay and within 60 days of discovery.",
  "Access, amendment and accounting requests from individuals are supported within the timeframes HIPAA sets.",
  "Books and records relating to PHI are made available to the Secretary of Health and Human Services on request.",
  "PHI is retained only for the retention period the organization configures, then destroyed.",
  "On termination, PHI is returned or destroyed where feasible, and protections survive for anything retained.",
  "Either party may terminate for an uncured material breach of this agreement.",
  "The organization is responsible for the lawfulness of the PHI it puts into the service and for its own users' access.",
  "This agreement is governed by the law of the organization's jurisdiction and supersedes conflicting terms in the subscription agreement.",
] as const;

// One entry per rendered section of the executed document.
export const BAA_SECTIONS: readonly { heading: string; body: string }[] = [
  {
    heading: "1. Definitions",
    body:
      "Capitalized terms used but not defined in this Agreement have the meaning given to them in " +
      "the Health Insurance Portability and Accountability Act of 1996 and its implementing " +
      "regulations at 45 CFR Parts 160 and 164 (\"HIPAA\"), as amended by the Health Information " +
      "Technology for Economic and Clinical Health Act (\"HITECH\"). \"Covered Entity\" means the " +
      "organization identified above. \"Business Associate\" means the vendor identified above. " +
      "\"Protected Health Information\" or \"PHI\" means protected health information, as defined at " +
      "45 CFR 160.103, that Business Associate creates, receives, maintains or transmits on behalf " +
      "of Covered Entity through the Service.",
  },
  {
    heading: "2. Permitted Uses and Disclosures",
    body:
      "Business Associate may use and disclose PHI only as necessary to perform the services " +
      "described in the subscription agreement between the parties, as required by law, or as " +
      "otherwise permitted by this Agreement. Business Associate may use PHI for its proper " +
      "management and administration and to carry out its legal responsibilities, and may disclose " +
      "PHI for those purposes only where the disclosure is required by law or where Business " +
      "Associate obtains reasonable assurances from the recipient that the information will remain " +
      "confidential, will be used or further disclosed only as required by law or for the purpose " +
      "for which it was disclosed, and that the recipient will notify Business Associate of any " +
      "breach of confidentiality.",
  },
  {
    heading: "3. Limitations on Use and Disclosure",
    body:
      "Business Associate shall not use or disclose PHI other than as permitted or required by this " +
      "Agreement or as required by law, and shall not use or disclose PHI in a manner that would " +
      "violate Subpart E of 45 CFR Part 164 if done by Covered Entity. Business Associate shall " +
      "make reasonable efforts to use, disclose and request only the minimum necessary PHI to " +
      "accomplish the intended purpose. Business Associate shall not sell PHI or use or disclose PHI " +
      "for marketing purposes except as permitted by HIPAA and authorized in writing by Covered " +
      "Entity.",
  },
  {
    heading: "4. Safeguards",
    body:
      "Business Associate shall use appropriate administrative, physical and technical safeguards, " +
      "and shall comply with Subpart C of 45 CFR Part 164 with respect to electronic PHI, to " +
      "prevent use or disclosure of PHI other than as provided for by this Agreement. Those " +
      "safeguards include encryption of PHI at rest and in transit, access controls scoped to the " +
      "Covered Entity's organization, unique user identification, audit logging of access to PHI, " +
      "and workforce access review.",
  },
  {
    heading: "5. Subcontractors",
    body:
      "In accordance with 45 CFR 164.502(e)(1)(ii) and 164.308(b)(2), Business Associate shall " +
      "ensure that any subcontractor that creates, receives, maintains or transmits PHI on behalf of " +
      "Business Associate agrees in writing to restrictions and conditions that are at least as " +
      "protective as those that apply to Business Associate under this Agreement. Business " +
      "Associate remains responsible for its subcontractors' handling of PHI.",
  },
  {
    heading: "6. Reporting of Security Incidents and Breaches",
    body:
      "Business Associate shall report to Covered Entity any use or disclosure of PHI not permitted " +
      "by this Agreement of which it becomes aware, any Security Incident with respect to " +
      "electronic PHI, and any Breach of Unsecured PHI. Notification of a Breach shall be made " +
      "without unreasonable delay and in no case later than sixty (60) calendar days after " +
      "discovery, and shall include, to the extent known, the identification of each individual " +
      "affected, the nature of the incident, the PHI involved, and the mitigation and corrective " +
      "steps taken. Unsuccessful attempts at unauthorized access that do not result in " +
      "unauthorized access to PHI are reported on an aggregate basis on request.",
  },
  {
    heading: "7. Individual Rights",
    body:
      "Business Associate shall make PHI in a Designated Record Set available to Covered Entity as " +
      "necessary to satisfy Covered Entity's obligations under 45 CFR 164.524, shall make such PHI " +
      "available for amendment and incorporate any amendment in accordance with 45 CFR 164.526, and " +
      "shall maintain and make available the information required to provide an accounting of " +
      "disclosures in accordance with 45 CFR 164.528. Where an individual makes a request directly " +
      "to Business Associate, Business Associate shall forward it to Covered Entity.",
  },
  {
    heading: "8. Availability to the Secretary",
    body:
      "Business Associate shall make its internal practices, books and records relating to the use " +
      "and disclosure of PHI received from, or created or received on behalf of, Covered Entity " +
      "available to the Secretary of the U.S. Department of Health and Human Services for purposes " +
      "of determining Covered Entity's compliance with HIPAA.",
  },
  {
    heading: "9. Retention",
    body:
      "Business Associate shall retain PHI only for the retention period configured by Covered " +
      "Entity in the Service, subject to any longer period required by law, after which the PHI is " +
      "destroyed in a manner that renders it unreadable and unreconstructable. Covered Entity is " +
      "responsible for selecting a retention period consistent with its own legal and professional " +
      "obligations.",
  },
  {
    heading: "10. Obligations of Covered Entity",
    body:
      "Covered Entity shall notify Business Associate of any limitation in its notice of privacy " +
      "practices, of any change in or revocation of an individual's permission to use or disclose " +
      "PHI, and of any restriction on the use or disclosure of PHI that Covered Entity has agreed " +
      "to or is required to abide by, to the extent any of these affect Business Associate's use or " +
      "disclosure of PHI. Covered Entity shall not request that Business Associate use or disclose " +
      "PHI in a manner that would not be permissible under Subpart E of 45 CFR Part 164 if done by " +
      "Covered Entity. Covered Entity is responsible for the lawfulness of the PHI it submits to " +
      "the Service and for the provisioning and deprovisioning of its own users.",
  },
  {
    heading: "11. Term and Termination",
    body:
      "This Agreement takes effect on the date of execution below and remains in effect until all " +
      "PHI is returned or destroyed, or protections are extended in accordance with this Section. " +
      "Either party may terminate this Agreement and the underlying subscription agreement if the " +
      "other party materially breaches this Agreement and fails to cure within thirty (30) days of " +
      "written notice. On termination, Business Associate shall return or destroy all PHI that it " +
      "maintains in any form and retain no copies, except where return or destruction is " +
      "infeasible, in which case Business Associate shall extend the protections of this Agreement " +
      "to the retained PHI and limit further uses and disclosures to those purposes that make " +
      "return or destruction infeasible.",
  },
  {
    heading: "12. Survival",
    body:
      "The obligations of Business Associate under Sections 4, 6, 9 and 11 survive termination of " +
      "this Agreement for so long as Business Associate retains any PHI.",
  },
  {
    heading: "13. Miscellaneous",
    body:
      "This Agreement is governed by the laws of the jurisdiction of Covered Entity's formation, " +
      "without regard to its conflict of laws rules. A reference to a section of HIPAA means the " +
      "section as in effect or as amended. The parties agree to take such action as is necessary to " +
      "amend this Agreement from time to time as is necessary for compliance with HIPAA. Any " +
      "ambiguity in this Agreement shall be resolved to permit compliance with HIPAA. In the event " +
      "of a conflict between this Agreement and the subscription agreement between the parties, " +
      "this Agreement controls with respect to PHI. This Agreement is executed electronically and " +
      "each party's electronic signature has the same effect as a handwritten signature.",
  },
];

// Picks the article from the jurisdiction so the preamble reads correctly for
// Ohio and Illinois alike.
const article = (word: string) =>
  /^[aeiou]/i.test(word.trim()) ? "an" : "a";

export const buildBaaPreamble = (party: BaaParty) =>
  `This HIPAA Business Associate Agreement (the "Agreement") is entered into by and between ` +
  `${party.companyLegalName}, ${article(party.companyJurisdiction)} ${party.companyJurisdiction} ` +
  `${party.companyEntityType} with principal offices at ${party.companyAddress} ("Covered Entity"), ` +
  `and ${VENDOR_LEGAL_NAME} ("Business Associate"). Covered Entity and Business Associate are each ` +
  `a "party" and together the "parties".`;

// The gate is a version match, not a timestamp check, so a bump blocks PHI
// routes for every HIPAA organization until it signs the new version.
export const isBaaCurrent = (
  acceptedAt: Date | string | null | undefined,
  version: string | null | undefined
) => Boolean(acceptedAt) && version === BAA_VERSION;
