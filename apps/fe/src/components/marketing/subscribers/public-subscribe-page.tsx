import { PublicShell } from "@/components/public-shell";
import {
  getSubscribeTarget,
  publicSubscribe,
} from "@/services/marketing/subscriber-service";
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
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { CircleCheckBig, Loader2, MailPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  name: z.string().optional(),
});

type SubscribeValues = z.infer<typeof schema>;

// Reached from the subscribe link in an email footer, usually by someone who
// was forwarded the mail and is not on the list yet.
export const PublicSubscribePage = () => {
  const { token } = useParams({ strict: false }) as { token: string };

  const {
    data: target,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["public-subscribe-target", token],
    queryFn: () => getSubscribeTarget(token),
    retry: false,
  });

  const form = useForm<SubscribeValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", name: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: SubscribeValues) =>
      publicSubscribe(token, {
        email: values.email,
        name: values.name || undefined,
      }),
  });

  return (
    <PublicShell>
      <div className="w-full max-w-lg rounded-2xl bg-card p-8 shadow-lg">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-40" />
          </div>
        ) : isError || !target ? (
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold text-foreground">
              Link no longer valid
            </h1>
            <p className="text-sm text-muted-foreground">
              This subscribe link has expired or was removed.
            </p>
          </div>
        ) : mutation.isSuccess ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CircleCheckBig className="size-10 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              You are subscribed
            </h1>
            <p className="text-sm text-muted-foreground">
              {target.organizationName} will email you from now on. Every email
              carries a link to stop.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-table-header">
                <MailPlus className="size-7 text-primary" />
              </span>
              <h1 className="text-2xl font-semibold text-foreground">
                Subscribe
              </h1>
              <p className="text-sm text-muted-foreground">
                Get email updates from {target.organizationName}.
              </p>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) =>
                  mutation.mutate(values)
                )}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Email <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="name@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {mutation.isError && (
                  <p className="text-sm text-destructive">
                    Something went wrong. Please try again.
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Subscribe
                </Button>
              </form>
            </Form>
          </div>
        )}
      </div>
    </PublicShell>
  );
};
