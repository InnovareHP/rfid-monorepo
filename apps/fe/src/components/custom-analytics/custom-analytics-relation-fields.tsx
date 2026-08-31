import type { ModuleColumn } from "@/services/board/board-module-service";
import type { CrmModule } from "@/services/module/module-service";
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

const RELATIONS = [
  { value: "REFERRAL_LINK", label: "Referral link" },
  { value: "FACILITY_LINK", label: "Facility link" },
  { value: "CONTACT_LINK", label: "Contact link" },
  { value: "COMPANY_LINK", label: "Company link" },
];

const DIRECTIONS = [
  { value: "OUTGOING", label: "Records point out" },
  { value: "INCOMING", label: "Records are pointed at" },
];

// The related module is a lookup for the field list only; picking no field
// groups by the related record's name, which is the common case.
const BY_NAME = "__name__";

type CustomAnalyticsRelationFieldsProps = {
  control: Control<BuilderValues>;
  modules: CrmModule[];
  relatedColumns: ModuleColumn[];
  relatedModuleId: string;
};

export function CustomAnalyticsRelationFields({
  control,
  modules,
  relatedColumns,
  relatedModuleId,
}: CustomAnalyticsRelationFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <FormField
          control={control}
          name="relationType"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Relation</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pick a relation" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {RELATIONS.map((relation) => (
                    <SelectItem key={relation.value} value={relation.value}>
                      {relation.label}
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
          name="relationDirection"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Direction</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {DIRECTIONS.map((direction) => (
                    <SelectItem key={direction.value} value={direction.value}>
                      {direction.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="flex items-start gap-2">
        <FormField
          control={control}
          name="relatedModuleId"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>Related module</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Group by record name" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {modules.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {relatedModuleId && (
          <FormField
            control={control}
            name="relatedFieldId"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Related field</FormLabel>
                <Select
                  value={field.value || BY_NAME}
                  onValueChange={(value) =>
                    field.onChange(value === BY_NAME ? "" : value)
                  }
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={BY_NAME}>Record name</SelectItem>
                    {relatedColumns.map((column) => (
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
    </div>
  );
}
