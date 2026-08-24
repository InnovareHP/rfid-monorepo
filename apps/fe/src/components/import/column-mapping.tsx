import type {
  ColumnSuggestion,
  NewFieldType,
} from "@/lib/helper/csv-column-mapping";
import type { ImportColumn } from "@/services/lead/lead-service";
import { Label } from "@dashboard/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { ColumnMappingRow } from "./column-mapping-row";

type Props = {
  headers: string[];
  columns: ImportColumn[];
  columnMap: Record<string, string>;
  newColumnTypes: Record<string, NewFieldType>;
  suggestions: Record<string, ColumnSuggestion[]>;
  nameColumn: string;
  recordLabelSingular: string;
  onMapChange: (header: string, value: string | null) => void;
  onNewFieldTypeChange: (header: string, fieldType: NewFieldType) => void;
  onNameColumnChange: (header: string) => void;
};

const NO_SUGGESTIONS: ColumnSuggestion[] = [];

export function ColumnMapping({
  headers,
  columns,
  columnMap,
  newColumnTypes,
  suggestions,
  nameColumn,
  recordLabelSingular,
  onMapChange,
  onNewFieldTypeChange,
  onNameColumnChange,
}: Props) {
  const mappedCount = headers.filter(
    (header) => columnMap[header] || newColumnTypes[header]
  ).length;

  const takenFieldIds = new Set(Object.values(columnMap));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-4">
        <Label htmlFor="name-column">
          Which column names each {recordLabelSingular}?
        </Label>
        <Select value={nameColumn} onValueChange={onNameColumnChange}>
          <SelectTrigger id="name-column" className="w-full sm:w-80">
            <SelectValue placeholder="Select a column" />
          </SelectTrigger>
          <SelectContent>
            {headers.map((header) => (
              <SelectItem key={header} value={header}>
                {header}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          This becomes the record title. It can also be mapped to a field below.
        </p>
      </div>

      <div className="rounded-xl border">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Map your columns</p>
          <p className="text-xs text-muted-foreground">
            {mappedCount} of {headers.length} mapped
          </p>
        </div>

        <div className="divide-y divide-border">
          {headers.map((header) => (
            <ColumnMappingRow
              key={header}
              header={header}
              columns={columns}
              fieldId={columnMap[header]}
              newFieldType={newColumnTypes[header]}
              suggestions={suggestions[header] ?? NO_SUGGESTIONS}
              takenFieldIds={takenFieldIds}
              onMapChange={onMapChange}
              onNewFieldTypeChange={onNewFieldTypeChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
