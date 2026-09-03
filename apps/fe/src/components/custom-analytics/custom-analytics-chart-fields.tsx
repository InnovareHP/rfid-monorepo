import type { ModuleColumn } from "@/services/board/board-module-service";
import type { CrmModule } from "@/services/module/module-service";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import { Input } from "@dashboard/ui/components/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import type { Control } from "react-hook-form";
import type { BuilderValues } from "./custom-analytics-builder-schema";
import { CustomAnalyticsConditionRows } from "./custom-analytics-condition-rows";
import { CustomAnalyticsRelationFields } from "./custom-analytics-relation-fields";

// Null means every record, so the option carries "0" and is mapped back.
const RANGES = [
  { value: "0", label: "All time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last 12 months" },
];

// Only the ranked charts rank, so only they truncate.
const GROUP_LIMITS = [
  { value: "5", label: "Top 5" },
  { value: "10", label: "Top 10" },
  { value: "20", label: "Top 20" },
  { value: "50", label: "Top 50" },
];

const AGGREGATIONS = [
  { value: "COUNT", label: "Count" },
  { value: "SUM", label: "Sum" },
  { value: "AVG", label: "Average" },
  { value: "MIN", label: "Minimum" },
  { value: "MAX", label: "Maximum" },
  { value: "PERCENT", label: "Percentage" },
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
  relatedColumns: ModuleColumn[];
  modules: CrmModule[];
  relatedModuleId: string;
  columnIds: string[];
  conditions: BuilderValues["conditions"];
  numeratorConditions: BuilderValues["conditions"];
  metricAggregation: BuilderValues["metricAggregation"];
  metricSource: BuilderValues["metricSource"];
  onToggleColumn: (fieldId: string) => void;
};

// Renders the field controls specific to the selected chart type, plus the
// shared optional filter row, for the analytics builder dialog.
export function CustomAnalyticsChartFields({
  control,
  chartType,
  dimensionType,
  columns,
  relatedColumns,
  modules,
  relatedModuleId,
  columnIds,
  conditions,
  numeratorConditions,
  metricAggregation,
  metricSource,
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
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
              name="metricSource"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Measure</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="FIELD_VALUE">Field values</SelectItem>
                      <SelectItem value="DAYS_TO_CHANGE">
                        Days until a field changes
                      </SelectItem>
                      <SelectItem value="MARKETING_ACTIVITY">
                        Liaison outreach
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {metricSource === "MARKETING_ACTIVITY" && (
              <FormField
                control={control}
                name="marketingMeasure"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Counts</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="INTERACTIONS">
                          Interactions
                        </SelectItem>
                        <SelectItem value="FACILITIES">
                          Facilities visited
                        </SelectItem>
                        <SelectItem value="PEOPLE">
                          People contacted
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {metricSource === "DAYS_TO_CHANGE" && (
              <FormField
                control={control}
                name="durationFieldId"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Tracked field</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pick a field" />
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
          </div>

          <div className="flex items-end gap-2">
            {metricSource === "FIELD_VALUE" && (
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
            )}

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
                      {AGGREGATIONS.filter(
                        (aggregation) =>
                          metricSource === "FIELD_VALUE" ||
                          aggregation.value !== "PERCENT"
                      ).map((aggregation) => (
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

          {/* Outreach rows have no board fields, so they group by their own
              dimensions rather than the field/owner/date set. */}
          {(chartType === "BAR" || chartType === "PIE") &&
            metricSource === "MARKETING_ACTIVITY" && (
              <FormField
                control={control}
                name="marketingGroupBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group by</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Pick a grouping" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LIAISON">Liaison</SelectItem>
                        <SelectItem value="FACILITY">Facility</SelectItem>
                        <SelectItem value="TOUCHPOINT">Touchpoint</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

          {(chartType === "BAR" || chartType === "PIE") &&
            metricSource !== "MARKETING_ACTIVITY" && (
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
                        <SelectItem value="RELATED_RECORD">
                          Related record
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {dimensionType === "RELATED_RECORD" && (
                <div className="flex-1" />
              )}

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

          {(chartType === "BAR" || chartType === "PIE") &&
            dimensionType === "RELATED_RECORD" && (
              <CustomAnalyticsRelationFields
                control={control}
                modules={modules}
                relatedColumns={relatedColumns}
                relatedModuleId={relatedModuleId}
              />
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

      {(chartType === "BAR" || chartType === "PIE") && (
        <FormField
          control={control}
          name="groupLimit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Groups shown</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {GROUP_LIMITS.map((limit) => (
                    <SelectItem key={limit.value} value={limit.value}>
                      {limit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {(chartType === "BAR" || chartType === "PIE") && (
        <div className="flex items-start gap-2">
          <FormField
            control={control}
            name="minGroupSize"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Min records per group</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="Any" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="maxGroupSize"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Max records per group</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" placeholder="Any" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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
        <CustomAnalyticsConditionRows
          control={control}
          columns={columns}
          conditions={conditions}
          name="conditions"
          matchName="filterMatch"
          label="Conditions (optional)"
        />
      )}

      {columns.length > 0 && metricAggregation === "PERCENT" && (
        <CustomAnalyticsConditionRows
          control={control}
          columns={columns}
          conditions={numeratorConditions}
          name="numeratorConditions"
          matchName="numeratorMatch"
          label="Percentage counts records matching"
        />
      )}

    </>
  );
}
