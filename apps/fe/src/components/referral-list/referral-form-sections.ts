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
      // Facility leads the form: it is the first thing a referral is filed under.
      { name: "Facility", span: "full", required: true },
      { name: RECORD_NAME_FIELD, span: "full", required: true },
      { name: "Referral Date", span: "half", required: true },
      {
        name: "County",
        span: "half",
        helperText:
          "Leave blank - the county is taken from the Facility's master list record.",
      },
      { name: "Number", span: "half", required: true },
    ],
  },
  {
    title: "Patient Information",
    fields: [
      { name: "Patient Name", span: "half", required: true },
      { name: "Date of Birth", span: "half", required: true },
      { name: "Payor", span: "half", required: true },
      { name: "Remote or Onsite", span: "half", required: true },
      { name: "Reason", span: "full", required: true },
      { name: "Status", span: "third", required: true },
      { name: "Admission Type", span: "third", required: true },
      { name: "CPAP", span: "third", required: true },
    ],
  },
  {
    title: "Assessment",
    fields: [
      {
        name: "Location",
        span: "full",
        required: true,
        helperText:
          "Selecting a result auto-fills City, State, and Zip below - you can still edit them after.",
        autoFill: {
          city: "City",
          state: "State",
          zipCode: "Zip Code",
        },
      },
      { name: "City", span: "third", required: true },
      { name: "State", span: "third", required: true },
      { name: "Zip Code", span: "third", required: true },
      { name: "Assessor", span: "half", required: true },
      { name: "Wrap Up", span: "half", required: true },
      { name: "Diagnosis / Behavior", span: "third", required: true },
      { name: "Action Date (Accepted / Rejected)", span: "third", required: true },
      { name: "Length of Assessment", span: "third", required: true },
    ],
  },
  {
    title: "Logistics and Notes",
    fields: [
      { name: "Transport Name", span: "half", required: true },
      { name: "Referred Out To", span: "half", required: true },
      { name: "Additional Notes", span: "full", multiline: true, required: true },
      { name: "Assessed", span: "full", required: true },
    ],
  },
];
