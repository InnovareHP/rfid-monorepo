import type { ModuleColumn } from "@/services/board/board-module-service";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import type { Control } from "react-hook-form";
import type { BuilderValues } from "./custom-analytics-builder-schema";

// Null means every record, so the option carries "0" and is mapped back.
const RANGES = [
  { value: "0", label: "All time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

const AGGREGATIONS = [
  { value: "COUNT", label: "Count" },
  { value: "SUM", label: "Sum" },
  { value: "AVG", label: "Average" },
  { value: "MIN", label: "Minimum" },
  { value: "MAX", label: "Maximum" },
];

const DATE_BUCKETS = [
  { value: "DAY", label: "Day" },
  { value: "WEEK", label: "Week" },
  { value: "MONTH", label: "Month" },
];

type CustomAnalyticsChartFieldsProps = {
  control: Control<BuilderValues>;
  chartType: BuilderValues["chartType"];
  dimensionType: BuilderValues["dimensionType"];
  columns: ModuleColumn[];
  columnIds: string[];
  onToggleColumn: (fieldId: string) => void;
};

// Renders the field controls specific to the selected chart type, plus the
// shared optional filter row, for the analytics builder dialog.
export function CustomAnalyticsChartFields({
  control,
  chartType,
  dimensionType,
  columns,
  columnIds,
  onToggleColumn,
}: CustomAnalyticsChartFieldsProps) {
  return (
    <>
      {chartType === "TABLE" ? (
        columns.length > 0 && (
          <FormField
            control={control}
            name="columnIds"
            render={() => (
              <FormItem>
                <FormLabel>Columns</FormLabel>
                <div className="grid grid-cols-2 gap-2">
                  {columns.map((column) => (
                    <label
                      key={column.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={columnIds.includes(column.id)}
                        onCheckedChange={() => onToggleColumn(column.id)}
                      />
                      {column.name}
                    </label>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )
      ) : (
        <>
          <div className="flex items-end gap-2">
            <FormField
              control={control}
              name="metricFieldId"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Metric field</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="None (count records)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {columns.map((column) => (
                        <SelectItem key={column.id} value={column.id}>
                          {column.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="metricAggregation"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Aggregation</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AGGREGATIONS.map((aggregation) => (
                        <SelectItem
                          key={aggregation.value}
                          value={aggregation.value}
                        >
                          {aggregation.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {(chartType === "BAR" || chartType === "PIE") && (
            <div className="flex items-end gap-2">
              <FormField
                control={control}
                name="dimensionType"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Group by</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FIELD">Field</SelectItem>
                        <SelectItem value="OWNER">Owner</SelectItem>
                        <SelectItem value="DATE">Date</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {dimensionType === "FIELD" && (
                <FormField
                  control={control}
                  name="dimensionFieldId"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Field</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose a field" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {columns.map((column) => (
                            <SelectItem key={column.id} value={column.id}>
                              {column.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {dimensionType === "DATE" && (
                <FormField
                  control={control}
                  name="dateBucket"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Bucket</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DATE_BUCKETS.map((bucket) => (
                            <SelectItem key={bucket.value} value={bucket.value}>
                              {bucket.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          )}

          {chartType === "LINE" && (
            <FormField
              control={control}
              name="dateBucket"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bucket</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DATE_BUCKETS.map((bucket) => (
                        <SelectItem key={bucket.value} value={bucket.value}>
                          {bucket.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </>
      )}

      <FormField
        control={control}
        name="range"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Date range</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {columns.length > 0 && (
        <div className="flex items-end gap-2">
          <FormField
            control={control}
            name="filterFieldId"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Filter (optional)</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="No filter" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {columns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="filterValue"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Equals</FormLabel>
                <FormControl>
                  <Input placeholder="Won" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </>
  );
}
