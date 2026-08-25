import type { CountyRow, OptionsResponse } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFormFooter,
  DialogFormHeader,
} from "@dashboard/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { cn } from "@dashboard/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Globe, Loader2, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const CountySchema = z.object({
  name: z.string().min(1, "County name is required"),
  liaisons: z.array(z.string()),
});

export type CountyFormType = z.infer<typeof CountySchema>;

type CountyFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  county?: CountyRow | null;
  liaisons: OptionsResponse[];
  isSubmitting?: boolean;
  onSubmit: (values: CountyFormType) => void;
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "?";

export function CountyFormDialog({
  open,
  onOpenChange,
  county,
  liaisons,
  isSubmitting,
  onSubmit,
}: CountyFormDialogProps) {
  const [search, setSearch] = useState("");

  const form = useForm<CountyFormType>({
    resolver: zodResolver(CountySchema),
    defaultValues: { name: "", liaisons: [] },
  });

  // Reopening for another county has to refill the fields.
  useEffect(() => {
    if (!open) return;
    form.reset({
      name: county?.name ?? "",
      liaisons: county?.liaisons ?? [],
    });
    setSearch("");
  }, [open, county]);

  const selected = form.watch("liaisons");
  const matches = liaisons.filter((liaison) =>
    liaison.value.toLowerCase().includes(search.trim().toLowerCase())
  );

  const toggleLiaison = (name: string) => {
    form.setValue(
      "liaisons",
      selected.includes(name)
        ? selected.filter((value) => value !== name)
        : [...selected, name],
      { shouldDirty: true }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogFormHeader
          icon={<Globe />}
          title={county ? "Edit County" : "Add County"}
          description="Add a county and assign someone responsible for it."
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-4 px-6 py-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      County Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Dallas, Kent, Ionia"
                        disabled={Boolean(county)}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Assigned To</FormLabel>
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search Team Members"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto rounded-lg border border-border p-2">
                  {matches.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                      No team members found
                    </p>
                  ) : (
                    matches.map((liaison) => (
                      <button
                        key={liaison.id}
                        type="button"
                        onClick={() => toggleLiaison(liaison.value)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted",
                          selected.includes(liaison.value) && "bg-muted"
                        )}
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-avatar-6 text-xs font-semibold text-avatar-foreground">
                          {initials(liaison.value)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {liaison.value}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            Liaison
                          </span>
                        </span>
                        {selected.includes(liaison.value) ? (
                          <Check className="size-4 shrink-0 text-foreground" />
                        ) : null}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            <DialogFormFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
               
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                {county ? "Save Changes" : "Add County"}
              </Button>
            </DialogFormFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
