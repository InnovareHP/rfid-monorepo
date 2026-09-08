import { moduleIcon } from "@/lib/helper/module-icons";
import {
  FormControl,
  FormDescription,
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
import type { ModuleGroup } from "@/services/module/module-group-service";
import { cn } from "@dashboard/ui/lib/utils";
import type { UseFormReturn } from "react-hook-form";
import type { ModuleFormValues } from "./module-setup-schema";
import { previewKey } from "./module-setup-schema";
import { MODULE_ICON_CHOICES } from "./module-templates";

// The value a "no folder" choice carries, since Radix Select treats an empty
// string as no selection at all.
const NO_GROUP = "none";

type ModuleIdentityStepProps = {
  form: UseFormReturn<ModuleFormValues>;
  label: string;
  groups: ModuleGroup[];
};

export const ModuleIdentityStep = ({
  form,
  label,
  groups,
}: ModuleIdentityStepProps) => (
  <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="label"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input placeholder="Vendors" {...field} />
            </FormControl>
            <FormDescription>
              What the sidebar and board call it.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="labelSingular"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Singular name</FormLabel>
            <FormControl>
              <Input placeholder="Vendor" {...field} />
            </FormControl>
            <FormDescription>
              Used for one record: "New Vendor".
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>

    <FormField
      control={form.control}
      name="groupId"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Sidebar group</FormLabel>
          <Select
            value={field.value || NO_GROUP}
            onValueChange={(value) =>
              field.onChange(value === NO_GROUP ? "" : value)
            }
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="No group" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value={NO_GROUP}>No group</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>
            Folders are made and renamed on the modules settings page.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      control={form.control}
      name="icon"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Icon</FormLabel>
          <div className="flex flex-wrap gap-2">
            {MODULE_ICON_CHOICES.map((name) => {
              const Choice = moduleIcon(name);
              const selected = field.value === name;

              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => field.onChange(name)}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-lg border transition-colors",
                    selected
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground"
                  )}
                >
                  <Choice className="size-5" />
                </button>
              );
            })}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />

    {label && (
      <div className="rounded-lg border border-border bg-muted/50 p-3">
        <p className="text-sm">
          Address will be{" "}
          <code className="rounded bg-background px-1.5 py-0.5 text-brand">
            /records/{previewKey(label)}
          </code>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          This is permanent. The name above can change later, the address
          cannot.
        </p>
      </div>
    )}
  </div>
);
