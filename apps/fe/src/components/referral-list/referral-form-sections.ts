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
      { name: "Contact Number", span: "half", required: true },
      { name: "Fax", span: "half" },
      { name: "Email", span: "half" },
    ],
  },
  {
    title: "Patient Information",
    fields: [
      { name: "Patient Name", span: "half", required: true },
      { name: "Date of Birth", span: "half", required: true },
      { name: "Payor", span: "half", required: true },
      { name: "Type of Assessment", span: "half", required: true },
      { name: "Reason", span: "full", required: true },
      // The action date is stamped by the status change, so it sits beside it.
      { name: "Admission Status", span: "half", required: true },
      { name: "Action Date", span: "half" },
    ],
  },
  {
    title: "Intake Notes",
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
        },
      },
      // Optional alongside Location: these exist to be auto-filled from it.
      { name: "City", span: "third" },
      { name: "State", span: "third" },
      { name: "Zip Code", span: "third" },
      { name: "Assessor", span: "half", required: true },
      { name: "Wrap Up", span: "half", required: true },
      { name: "Diagnosis / Behavior", span: "full", required: true },
      // Transport is not always arranged by the time intake is written up.
      { name: "Transport Name", span: "half" },
    ],
  },
];
