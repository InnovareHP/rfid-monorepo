// A blank module is a blank table, so the wizard opens on a starting shape.
// These are fixed field sets, never a copy of another module in the org.
export const MODULE_TEMPLATES = [
  {
    value: "PEOPLE",
    label: "People",
    description: "Names, contact details and a status.",
    fields: [
      { fieldName: "Email", fieldType: "EMAIL" },
      { fieldName: "Phone", fieldType: "PHONE" },
      { fieldName: "Address", fieldType: "LOCATION" },
      { fieldName: "Status", fieldType: "STATUS" },
      { fieldName: "Notes", fieldType: "TEXT" },
    ],
  },
  {
    value: "COMPANY",
    label: "Organizations",
    description: "Businesses, facilities or vendors.",
    fields: [
      { fieldName: "Website", fieldType: "TEXT" },
      { fieldName: "Phone", fieldType: "PHONE" },
      { fieldName: "Address", fieldType: "LOCATION" },
      { fieldName: "Status", fieldType: "STATUS" },
      { fieldName: "Notes", fieldType: "TEXT" },
    ],
  },
  {
    value: "CUSTOM",
    label: "Custom",
    description: "Start with one column and add your own.",
    fields: [{ fieldName: "Notes", fieldType: "TEXT" }],
  },
] as const;

export const MODULE_FIELD_TYPES = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone" },
  { value: "DATE", label: "Date" },
  { value: "CHECKBOX", label: "Checkbox" },
  { value: "DROPDOWN", label: "Dropdown" },
  { value: "STATUS", label: "Status" },
  { value: "LOCATION", label: "Address" },
] as const;

export const MODULE_ICON_CHOICES = [
  "Table2",
  "Users",
  "Contact",
  "Building2",
  "Truck",
  "FileText",
] as const;
