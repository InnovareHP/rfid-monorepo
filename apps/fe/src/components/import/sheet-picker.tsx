import type { ParsedSheet } from "@/lib/helper/spreadsheet-parse";
import { Label } from "@dashboard/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";

type Props = {
  sheets: ParsedSheet[];
  value: string;
  onChange: (name: string) => void;
};

export function SheetPicker({ sheets, value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-4">
      <Label htmlFor="sheet-picker">Which sheet should be imported?</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="sheet-picker" className="w-full sm:w-80">
          <SelectValue placeholder="Select a sheet" />
        </SelectTrigger>
        <SelectContent>
          {sheets.map((sheet) => (
            <SelectItem
              key={sheet.name}
              value={sheet.name}
              disabled={!sheet.headers.length}
            >
              {sheet.name}
              <span className="ml-2 text-xs text-muted-foreground">
                {sheet.rows.length} rows
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        One sheet is imported per run. Sheets are never merged.
      </p>
    </div>
  );
}
