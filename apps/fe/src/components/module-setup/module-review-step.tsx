import { moduleIcon } from "@/lib/helper/module-icons";
import type { ModuleColumn } from "./module-setup-schema";
import { previewKey } from "./module-setup-schema";
import { MODULE_FIELD_TYPES } from "./module-templates";

type ModuleReviewStepProps = {
  label: string;
  labelSingular: string;
  icon: string;
  columns: ModuleColumn[];
};

const exampleValue = (column: ModuleColumn) =>
  column.options?.length
    ? column.options[0]
    : (MODULE_FIELD_TYPES.find((type) => type.value === column.fieldType)
        ?.label ?? "Text");

export const ModuleReviewStep = ({
  label,
  labelSingular,
  icon,
  columns,
}: ModuleReviewStepProps) => {
  const Icon = moduleIcon(icon);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
        <span className="flex size-10 items-center justify-center rounded-lg bg-brand text-brand-foreground">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            /records/{previewKey(label)} &middot; {columns.length}{" "}
            {columns.length === 1 ? "column" : "columns"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">How the board will look</p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-table-header">
              <tr>
                <th className="whitespace-nowrap p-2 font-medium">
                  {labelSingular} Name
                </th>
                {columns.map((column) => (
                  <th
                    key={column.id}
                    className="whitespace-nowrap p-2 font-medium"
                  >
                    {column.fieldName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="text-muted-foreground">
                <td className="whitespace-nowrap p-2">
                  Example {labelSingular.toLowerCase()}
                </td>
                {columns.map((column) => (
                  <td key={column.id} className="whitespace-nowrap p-2">
                    {exampleValue(column)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          You can add, rename and remove columns after the module exists.
        </p>
      </div>
    </div>
  );
};
