import { normalizeFieldName } from "@dashboard/shared";
import { BoardFieldType, Field, FieldOption } from "@prisma/client";
import { render } from "@react-email/render";

export const generateTemplate = (template: React.ReactNode) => {
  return render(template);
};

export const findLeadFieldFromCSV = (
  csvHeader: string,
  fields: Field & { FieldOption: FieldOption[] }[]
): (Field & { FieldOption: FieldOption[] }) | null => {
  const header = normalizeFieldName(csvHeader);

  const foundField = fields.find(
    (field: Field & { FieldOption: FieldOption[] }) =>
      normalizeFieldName(field.fieldName) === header
  );

  if (!foundField) {
    return null;
  }

  return foundField as unknown as Field & {
    FieldOption: FieldOption[];
  };
};

export const isSelectType = (type: BoardFieldType): boolean => {
  return type === "DROPDOWN" || type === "STATUS" || type === "MULTISELECT";
};
