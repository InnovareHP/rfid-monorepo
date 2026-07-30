import {
  RECORD_NAME_FIELD,
  type RecordFormSection,
} from "@/components/record-create/record-create-page";

// Field names match the REFERRAL fields seeded per organization; anything else
// falls into the last section automatically.
export const REFERRAL_FORM_SECTIONS: RecordFormSection[] = [
  {
    title: "Basic Information",
    fields: [
      { name: RECORD_NAME_FIELD, span: "full", required: true },
      { name: "Referral Date", span: "half", required: true },
      { name: "County", span: "half", required: true },
      { name: "Facility", span: "half", required: true },
      { name: "Number", span: "half" },
    ],
  },
  {
    title: "Patient Information",
    fields: [
      { name: "Patient Name", span: "half", required: true },
      { name: "Date of Birth", span: "half", required: true },
      { name: "Payor", span: "half" },
      { name: "Remote or Onsite", span: "half" },
      { name: "Reason", span: "full", required: true },
      { name: "Status", span: "third", required: true },
      { name: "Admission Type", span: "third" },
      { name: "CPAP", span: "third" },
    ],
  },
  {
    title: "Assessment",
    fields: [
      {
        name: "Location",
        span: "full",
        helperText:
          "Selecting a result auto-fills City, State, and Zip below - you can still edit them after.",
        autoFill: {
          city: "City",
          state: "State",
          zipCode: "Zip Code",
          county: "County",
        },
      },
      { name: "City", span: "third" },
      { name: "State", span: "third" },
      { name: "Zip Code", span: "third" },
      { name: "Assessor", span: "half" },
      { name: "Wrap Up", span: "half" },
      { name: "Diagnosis / Behavior", span: "third" },
      { name: "Action Date (Accepted / Rejected)", span: "third" },
      { name: "Length of Assessment", span: "third" },
    ],
  },
  {
    title: "Logistics and Notes",
    fields: [
      { name: "Transport Name", span: "half" },
      { name: "Referred Out To", span: "half" },
      { name: "Additional Notes", span: "full", multiline: true },
      { name: "Assessed", span: "full" },
    ],
  },
];
