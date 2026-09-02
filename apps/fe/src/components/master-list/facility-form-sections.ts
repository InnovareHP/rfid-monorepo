import {
  RECORD_NAME_FIELD,
  type RecordFormSection,
} from "@/components/record-create/record-create-page";

// Field names match the LEAD fields seeded per organization; anything else
// falls into the last section automatically.
export const FACILITY_FORM_SECTIONS: RecordFormSection[] = [
  {
    title: "Basic Information",
    fields: [
      { name: RECORD_NAME_FIELD, span: "full", required: true },
      { name: "Type of Facility", span: "half", required: true },
      { name: "Number of Beds", span: "half", required: true },
    ],
  },
  {
    title: "Location",
    fields: [
      {
        name: "Address",
        span: "full",
        required: true,
        helperText:
          "Selecting a result auto-fills City, State, and Zip below - you can still edit them after.",
        autoFill: {
          city: "City",
          state: "State",
          zipCode: "Zip Code",
          county: "County",
        },
      },
      { name: "City", span: "half", required: true },
      { name: "State", span: "half", required: true },
      { name: "Zip Code", span: "half", required: true },
      { name: "County", span: "half", required: true },
    ],
  },
  {
    title: "Contact Information",
    fields: [
      { name: "Phone", span: "half", required: true },
      { name: "Fax", span: "half", required: true },
      { name: "Medical Director", span: "third", required: true },
      { name: "Director of Nursing", span: "third", required: true },
      { name: "Admissions/Marketing", span: "third", required: true },
    ],
  },
  {
    title: "Additional Details",
    fields: [
      { name: "Psychiatric Services", span: "full", required: true },
      { name: "Notes", span: "full", multiline: true, required: true },
    ],
  },
];
