import {
  createSender,
  verifySender,
  type SenderIdentity,
  type SenderKind,
} from "@/services/marketing/sender-service";
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
import { getGmailStatus, getOutlookStatus } from "@/services/lead/lead-service";
import { cn } from "@dashboard/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  AtSign,
  Building2,
  Globe,
  Loader2,
  MailCheck,
  Plug,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DnsRecordsPanel } from "./dns-records-panel";

const KIND_OPTIONS: {
  kind: SenderKind;
  title: string;
  blurb: string;
  icon: typeof AtSign;
}[] = [
  {
    kind: "PERSONAL",
    title: "Personal email",
    blurb: "Send from the Gmail or Outlook mailbox you already connected.",
    icon: AtSign,
  },
  {
    kind: "MANAGED_DOMAIN",
    title: "Create a domain",
    blurb: "We set up a sending subdomain for you. No DNS work on your side.",
    icon: Building2,
  },
  {
    kind: "CUSTOM_DOMAIN",
    title: "Use your work domain",
    blurb: "Send as your own domain. You publish the MX and TXT records.",
    icon: Globe,
  },
];

const senderFormSchema = z
  .object({
    kind: z.enum(["PERSONAL", "MANAGED_DOMAIN", "CUSTOM_DOMAIN"]),
    label: z.string().min(1, "Name this sender"),
    fromName: z.string().optional(),
    subdomain: z.string().optional(),
    domain: z.string().optional(),
    mailbox: z.string().optional(),
    replyTo: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.kind === "MANAGED_DOMAIN" && !values.subdomain?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["subdomain"],
        message: "Pick a subdomain",
      });
    }
    if (values.kind === "CUSTOM_DOMAIN" && !values.domain?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["domain"],
        message: "Enter your domain",
      });
    }
  });

type SenderFormValues = z.infer<typeof senderFormSchema>;

type SenderSetupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (sender: SenderIdentity) => void;
};

export function SenderSetupDialog({
  open,
  onOpenChange,
  onCreated,
}: SenderSetupDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { team } = useParams({ strict: false }) as { team: string };

  // A personal sender needs a connected mailbox, so the dialog checks before
  // offering it rather than letting the API reject the submit.
  const { data: mailbox } = useQuery({
    queryKey: ["mailbox-connection"],
    queryFn: async () => {
      const [gmail, outlook] = await Promise.all([
        getGmailStatus(),
        getOutlookStatus(),
      ]);
      return { email: gmail.email ?? outlook.email };
    },
    enabled: open,
  });

  // Set once the identity exists: the dialog switches to showing its DNS
  // records rather than closing, because setup is not finished at create time.
  const [created, setCreated] = useState<SenderIdentity | null>(null);

  const form = useForm<SenderFormValues>({
    resolver: zodResolver(senderFormSchema),
    defaultValues: {
      kind: "PERSONAL",
      label: "",
      fromName: "",
      subdomain: "",
      domain: "",
      mailbox: "hello",
      replyTo: "",
    },
  });

  const kind = form.watch("kind");

  const createMutation = useMutation({
    mutationFn: (values: SenderFormValues) => {
      const shared = {
        label: values.label.trim(),
        fromName: values.fromName?.trim() || undefined,
      };

      if (values.kind === "PERSONAL") {
        return createSender({ kind: "PERSONAL", ...shared });
      }
      const replyTo = values.replyTo?.trim() || undefined;

      if (values.kind === "MANAGED_DOMAIN") {
        return createSender({
          kind: "MANAGED_DOMAIN",
          ...shared,
          subdomain: values.subdomain!.trim(),
          mailbox: values.mailbox?.trim() || undefined,
          replyTo,
        });
      }
      return createSender({
        kind: "CUSTOM_DOMAIN",
        ...shared,
        domain: values.domain!.trim(),
        mailbox: values.mailbox?.trim() || undefined,
        replyTo,
      });
    },
    onSuccess: (sender) => {
      queryClient.invalidateQueries({ queryKey: ["marketing-senders"] });
      onCreated?.(sender);

      if (sender.kind === "PERSONAL") {
        toast.success("Sender ready");
        close();
        return;
      }

      setCreated(sender);
      toast.success("Domain added. Publish the records below.");
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Failed to create sender";
      toast.error(message);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => verifySender(id),
    onSuccess: (sender) => {
      setCreated(sender);
      queryClient.invalidateQueries({ queryKey: ["marketing-senders"] });
      if (sender.status === "VERIFIED") {
        toast.success("Domain verified");
        close();
        return;
      }
      toast.info("Records are not visible yet. Try again shortly.");
    },
    onError: () => toast.error("Could not check verification"),
  });

  const close = () => {
    setCreated(null);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : close())}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogFormHeader
          icon={<MailCheck />}
          title={created ? "Verify your domain" : "Add a sender"}
          description={
            created
              ? "Campaigns can use this sender once it is verified."
              : "Choose where this campaign's email comes from."
          }
        />

        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5">
          {created ? (
            <DnsRecordsPanel
              sender={created}
              isVerifying={verifyMutation.isPending}
              onVerify={() => verifyMutation.mutate(created.id)}
            />
          ) : (
            <Form {...form}>
              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {KIND_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const selected = field.value === option.kind;

                        return (
                          <button
                            key={option.kind}
                            type="button"
                            onClick={() => field.onChange(option.kind)}
                            className={cn(
                              "rounded-xl border p-4 text-left transition-colors",
                              selected
                                ? "border-brand bg-[#F4F9FF]"
                                : "border-gray-200 hover:border-gray-300"
                            )}
                          >
                            <Icon
                              className={cn(
                                "size-5",
                                selected ? "text-brand" : "text-gray-400"
                              )}
                            />
                            <span className="mt-2 block text-sm font-semibold text-gray-900">
                              {option.title}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {option.blurb}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Sender Name <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Admissions outreach" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fromName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Health" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {kind === "MANAGED_DOMAIN" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="mailbox"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mailbox</FormLabel>
                        <FormControl>
                          <Input placeholder="hello" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subdomain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Subdomain <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="acme" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {kind === "CUSTOM_DOMAIN" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="mailbox"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mailbox</FormLabel>
                        <FormControl>
                          <Input placeholder="hello" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="domain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Domain <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="acme-health.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {kind !== "PERSONAL" && (
                <FormField
                  control={form.control}
                  name="replyTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Replies Go To</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@acme-health.com"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        A sending domain has no inbox. Leave blank to use your
                        own address.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {kind === "PERSONAL" &&
                (mailbox?.email ? (
                  <p className="text-sm text-muted-foreground">
                    Sends from{" "}
                    <span className="font-medium text-gray-900">
                      {mailbox.email}
                    </span>
                    , so replies thread straight back into it.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-[#F4F9FF] p-4">
                    <p className="text-sm text-gray-700">
                      No mailbox is connected to your account yet.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        close();
                        navigate({
                          to: "/$team/integrations",
                          params: { team },
                        });
                      }}
                    >
                      <Plug className="size-4" />
                      Connect a mailbox
                    </Button>
                  </div>
                ))}
            </Form>
          )}
        </div>

        <DialogFormFooter>
          <Button type="button" variant="outline" onClick={close}>
            {created ? "Finish later" : "Cancel"}
          </Button>
          {!created && (
            <Button
              className="bg-brand text-white hover:bg-brand/90"
              disabled={
                createMutation.isPending ||
                (kind === "PERSONAL" && !mailbox?.email)
              }
              onClick={form.handleSubmit((values) =>
                createMutation.mutate(values)
              )}
            >
              {createMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Add Sender
            </Button>
          )}
        </DialogFormFooter>
      </DialogContent>
    </Dialog>
  );
}
