import { getApiErrorMessage } from "@/lib/helper/helper";
import { purgeOrganizationData } from "@/services/compliance/compliance-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const schema = (organizationName: string) =>
  z.object({
    confirmation: z
      .string()
      .refine((value) => value === organizationName, "Name does not match"),
  });

export function PurgeDataCard({
  organizationName,
}: {
  organizationName: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const form = useForm<{ confirmation: string }>({
    resolver: zodResolver(schema(organizationName)),
    defaultValues: { confirmation: "" },
  });

  const purge = useMutation({
    mutationFn: (values: { confirmation: string }) =>
      purgeOrganizationData(values.confirmation),
    onSuccess: ({ deleted }) => {
      toast.success(`Deleted ${deleted.toLocaleString()} records`);
      setOpen(false);
      form.reset();
      queryClient.clear();
    },
    onError: (error) =>
      toast.error(getApiErrorMessage(error, "Could not delete the data")),
  });

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-destructive" />
          Delete organization data
        </CardTitle>

        <CardDescription>
          Permanently deletes every record, log, task and campaign in this
          organization. Members, your signed agreement and your billing history
          are kept. Nothing here is deleted on a schedule, so your data stays
          until you ask for this.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete all data
        </Button>
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) form.reset();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>This cannot be undone</DialogTitle>

            <DialogDescription>
              Export anything you still need first. Type{" "}
              <span className="font-medium text-foreground">
                {organizationName}
              </span>{" "}
              to confirm.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => purge.mutate(values))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="confirmation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization name</FormLabel>

                    <FormControl>
                      <Input autoComplete="off" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="destructive"
                  disabled={purge.isPending}
                >
                  Delete all data
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
