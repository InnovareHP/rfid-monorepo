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
import { cn } from "@dashboard/ui/lib/utils";
import type { UseFormReturn } from "react-hook-form";
import type { ModuleFormValues } from "./module-setup-schema";
import { previewKey } from "./module-setup-schema";
import { MODULE_ICON_CHOICES } from "./module-templates";

type ModuleIdentityStepProps = {
  form: UseFormReturn<ModuleFormValues>;
  label: string;
  groupOptions: string[];
};

export const ModuleIdentityStep = ({
  form,
  label,
  groupOptions,
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
      name="groupName"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Sidebar group</FormLabel>
          <FormControl>
            {/* Free text with the existing names offered: a group is created by
                typing one, and reused by picking it. */}
            <Input
              list="module-group-options"
              placeholder="Optional, e.g. Sales"
              {...field}
            />
          </FormControl>
          <datalist id="module-group-options">
            {groupOptions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>

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
