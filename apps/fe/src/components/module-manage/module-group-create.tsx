import { Button } from "@dashboard/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import { Spinner } from "@dashboard/ui/components/spinner";
import { zodResolver } from "@hookform/resolvers/zod";
import { FolderPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Matches CreateModuleGroupSchema on the API, so a name too long is refused
// here rather than coming back as a 400.
const schema = z.object({
  name: z.string().trim().min(1, "Group name is required").max(40),
});

type FormValues = z.infer<typeof schema>;

type ModuleGroupCreateProps = {
  open: boolean;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
};

export function ModuleGroupCreate({
  open,
  isSaving,
  onOpenChange,
  onCreate,
}: ModuleGroupCreateProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  const submit = (values: FormValues) => {
    onCreate(values.name.trim());
    form.reset();
    onOpenChange(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        // A half-typed name does not survive the popover closing.
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline">
          <FolderPlus className="size-4" />
          New group
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New group</FormLabel>
                  <FormControl>
                    <Input
                      autoFocus
                      maxLength={40}
                      placeholder="e.g. Pipeline"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSaving}>
                {isSaving && <Spinner className="size-4" />}
                Create
              </Button>
            </div>
          </form>
        </Form>
      </PopoverContent>
    </Popover>
  );
}
