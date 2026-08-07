// How each board field type is described in the builder, matching the control
// the public form renders for it.
const LABEL_BY_FIELD_TYPE: Record<string, string> = {
  TEXT: "Text",
  NUMBER: "Number",
  EMAIL: "Email",
  PHONE: "Phone",
  DATE: "Date picker",
  CHECKBOX: "Checkbox",
  DROPDOWN: "Dropdown",
  STATUS: "Status",
  MULTISELECT: "Multi-select",
  LOCATION: "Address lookup",
};

export const fieldTypeLabel = (fieldType: string) =>
  LABEL_BY_FIELD_TYPE[fieldType] ?? "Text";
