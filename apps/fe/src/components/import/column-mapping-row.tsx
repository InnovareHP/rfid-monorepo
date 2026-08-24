import {
  CREATE_COLUMN,
  IGNORE_COLUMN,
  NEW_FIELD_TYPES,
  type ColumnSuggestion,
  type NewFieldType,
} from "@/lib/helper/csv-column-mapping";
import type { ImportColumn } from "@/services/lead/lead-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { memo } from "react";

type Props = {
  header: string;
  columns: ImportColumn[];
  fieldId: string | undefined;
  newFieldType: NewFieldType | undefined;
  suggestions: ColumnSuggestion[];
  takenFieldIds: Set<string>;
  onMapChange: (header: string, value: string | null) => void;
  onNewFieldTypeChange: (header: string, fieldType: NewFieldType) => void;
};

function ColumnMappingRowBase({
  header,
  columns,
  fieldId,
  newFieldType,
  suggestions,
  takenFieldIds,
  onMapChange,
  onNewFieldTypeChange,
}: Props) {
  const selected = newFieldType ? CREATE_COLUMN : (fieldId ?? IGNORE_COLUMN);

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{header}</span>
          {newFieldType && <Badge variant="info">New field</Badge>}
          {!fieldId && !newFieldType && (
            <Badge variant="outline">Not imported</Badge>
          )}
        </div>

        <Select
          value={selected}
          onValueChange={(value) =>
            onMapChange(header, value === IGNORE_COLUMN ? null : value)
          }
        >
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={IGNORE_COLUMN}>Do not import</SelectItem>
            <SelectItem value={CREATE_COLUMN}>Create new field</SelectItem>
            {columns.map((column) => (
              <SelectItem
                key={column.id}
                value={column.id}
                disabled={takenFieldIds.has(column.id) && fieldId !== column.id}
              >
                {column.name}
                <span className="ml-2 text-xs text-muted-foreground">
                  {column.type}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {newFieldType && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <span className="text-xs text-muted-foreground">
            Create &quot;{header}&quot; as
          </span>
          <Select
            value={newFieldType}
            onValueChange={(value) =>
              onNewFieldTypeChange(header, value as NewFieldType)
            }
          >
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NEW_FIELD_TYPES.map((fieldType) => (
                <SelectItem key={fieldType} value={fieldType}>
                  {fieldType}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!fieldId && !newFieldType && suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Did you mean</span>
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion.id}
              variant="outline"
              size="sm"
              className="h-7 rounded-full text-xs"
              onClick={() => onMapChange(header, suggestion.id)}
            >
              {suggestion.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export const ColumnMappingRow = memo(ColumnMappingRowBase);
