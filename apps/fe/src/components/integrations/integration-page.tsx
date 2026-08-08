import { IntegrationCard } from "@/components/integrations/integration-card";
import { PageHeader } from "@/components/page-header";
import {
  disconnectGoogleCalendar,
  disconnectOutlookCalendar,
  getCalendarConnectionStatus,
  getGoogleCalendarAuthUrl,
  getOutlookCalendarAuthUrl,
} from "@/services/calendar/calendar-service";
import { getEmailIngestAddress } from "@/services/email/email-service";
import {
  connectFaxIntegration,
  disconnectFaxIntegration,
  getFaxIntegrationStatus,
} from "@/services/fax/fax-service";
import {
  disconnectGmail,
  disconnectOutlook,
  getGmailAuthUrl,
  getGmailStatus,
  getOutlookAuthUrl,
  getOutlookStatus,
} from "@/services/lead/lead-service";
import { Button } from "@dashboard/ui/components/button";
import { Card } from "@dashboard/ui/components/card";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@dashboard/ui/components/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { Calendar, Copy, Inbox, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const TAB_TRIGGER =
  "rounded-md px-4 py-1.5 text-sm font-bold text-muted-foreground data-[state=active]:bg-brand-accent data-[state=active]:text-brand-accent-foreground data-[state=active]:shadow-xs";

const ProviderLogo = ({ src, alt }: { src: string; alt: string }) => (
  <img src={src} alt={alt} className="size-full object-contain" />
);

export default function IntegrationPage() {
  const queryClient = useQueryClient();
  const search = useSearch({ strict: false }) as Record<string, string>;

  // Inbound ingest is optional infrastructure: the card only exists once it is set up.
  const ingestAddressQuery = useQuery({
    queryKey: ["email-ingest-address"],
    queryFn: getEmailIngestAddress,
    retry: false,
  });

  const ingestAddress = ingestAddressQuery.data?.address ?? null;

  // ---- Email: Gmail ----
  const gmailStatusQuery = useQuery({
    queryKey: ["gmail-status"],
    queryFn: getGmailStatus,
  });

  const connectGmailMutation = useMutation({
    mutationFn: getGmailAuthUrl,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast.error("Failed to start Gmail connection");
    },
  });

  const disconnectGmailMutation = useMutation({
    mutationFn: disconnectGmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gmail-status"] });
      toast.success("Gmail disconnected successfully");
    },
    onError: () => {
      toast.error("Failed to disconnect Gmail");
    },
  });

  // ---- Email: Outlook ----
  const outlookStatusQuery = useQuery({
    queryKey: ["outlook-status"],
    queryFn: getOutlookStatus,
  });

  const connectOutlookMutation = useMutation({
    mutationFn: getOutlookAuthUrl,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast.error("Failed to start Outlook connection");
    },
  });

  const disconnectOutlookMutation = useMutation({
    mutationFn: disconnectOutlook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outlook-status"] });
      toast.success("Outlook disconnected successfully");
    },
    onError: () => {
      toast.error("Failed to disconnect Outlook");
    },
  });

  // ---- Calendar ----
  const calendarStatusQuery = useQuery({
    queryKey: ["calendar-status"],
    queryFn: getCalendarConnectionStatus,
  });

  const connectGoogleCalendarMutation = useMutation({
    mutationFn: getGoogleCalendarAuthUrl,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast.error("Failed to start Google Calendar connection");
    },
  });

  const disconnectGoogleCalendarMutation = useMutation({
    mutationFn: disconnectGoogleCalendar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-status"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Google Calendar disconnected");
    },
    onError: () => {
      toast.error("Failed to disconnect Google Calendar");
    },
  });

  const connectOutlookCalendarMutation = useMutation({
    mutationFn: getOutlookCalendarAuthUrl,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast.error("Failed to start Outlook Calendar connection");
    },
  });

  const disconnectOutlookCalendarMutation = useMutation({
    mutationFn: disconnectOutlookCalendar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-status"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Outlook Calendar disconnected");
    },
    onError: () => {
      toast.error("Failed to disconnect Outlook Calendar");
    },
  });

  // ---- Fax: Eldon Fax ----
  const [faxApiKey, setFaxApiKey] = useState("");

  const faxStatusQuery = useQuery({
    queryKey: ["fax-integration-status"],
    queryFn: getFaxIntegrationStatus,
  });

  const connectFaxMutation = useMutation({
    mutationFn: connectFaxIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fax-integration-status"] });
      setFaxApiKey("");
      toast.success("Eldon Fax connected");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ?? "Failed to connect Eldon Fax"
      );
    },
  });

  const disconnectFaxMutation = useMutation({
    mutationFn: disconnectFaxIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fax-integration-status"] });
      toast.success("Eldon Fax disconnected");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ?? "Failed to disconnect Eldon Fax"
      );
    },
  });

  // ---- Toast on redirect ----
  useEffect(() => {
    if (search?.gmail === "connected") {
      toast.success("Gmail connected successfully!");
      queryClient.invalidateQueries({ queryKey: ["gmail-status"] });
    } else if (search?.gmail === "error") {
      toast.error(search?.message || "Failed to connect Gmail");
    }
  }, [queryClient, search?.gmail, search?.message]);

  useEffect(() => {
    if (search?.outlook === "connected") {
      toast.success("Outlook connected successfully!");
      queryClient.invalidateQueries({ queryKey: ["outlook-status"] });
    } else if (search?.outlook === "error") {
      toast.error(search?.message || "Failed to connect Outlook");
    }
  }, [queryClient, search?.outlook, search?.message]);

  useEffect(() => {
    if (search?.google_calendar === "connected") {
      toast.success("Google Calendar connected successfully!");
      queryClient.invalidateQueries({ queryKey: ["calendar-status"] });
    } else if (search?.google_calendar === "error") {
      toast.error(search?.message || "Failed to connect Google Calendar");
    }
  }, [queryClient, search?.google_calendar, search?.message]);

  useEffect(() => {
    if (search?.outlook_calendar === "connected") {
      toast.success("Outlook Calendar connected successfully!");
      queryClient.invalidateQueries({ queryKey: ["calendar-status"] });
    } else if (search?.outlook_calendar === "error") {
      toast.error(search?.message || "Failed to connect Outlook Calendar");
    }
  }, [queryClient, search?.outlook_calendar, search?.message]);

  const faxKeyReady = faxApiKey.trim().length >= 10;

  return (
    <div className="page-style w-full">
      <div className="mx-auto max-w-7xl space-y-8 p-6 sm:p-8">
        <PageHeader
          title="Integrations"
          description="Connect your external tools and accounts."
        />

        <Tabs defaultValue="email" className="space-y-6">
          <TabsList className="h-auto w-fit gap-1 rounded-xl bg-table-header p-2.5">
            <TabsTrigger value="email" className={TAB_TRIGGER}>
              Email
            </TabsTrigger>
            <TabsTrigger value="calendar" className={TAB_TRIGGER}>
              Calendar
            </TabsTrigger>
            <TabsTrigger value="fax" className={TAB_TRIGGER}>
              Fax
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="mt-0 space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <IntegrationCard
                name="Google Mail"
                description="Send activity emails from your Gmail account."
                logo={
                  <ProviderLogo
                    src="/branding/Integrations/gmail.png"
                    alt="Gmail"
                  />
                }
                connected={Boolean(gmailStatusQuery.data?.connected)}
                connectedDetail={`Sending as ${gmailStatusQuery.data?.email ?? ""}`}
                onConnect={() => connectGmailMutation.mutate()}
                onDisconnect={() => disconnectGmailMutation.mutate()}
                isConnecting={connectGmailMutation.isPending}
                isDisconnecting={disconnectGmailMutation.isPending}
                disabled={gmailStatusQuery.isLoading}
              />

              <IntegrationCard
                name="Microsoft Outlook"
                description="Send activity emails from your Outlook account."
                logo={
                  <ProviderLogo
                    src="/branding/Integrations/outlook.png"
                    alt="Outlook"
                  />
                }
                connected={Boolean(outlookStatusQuery.data?.connected)}
                connectedDetail={`Sending as ${outlookStatusQuery.data?.email ?? ""}`}
                onConnect={() => connectOutlookMutation.mutate()}
                onDisconnect={() => disconnectOutlookMutation.mutate()}
                isConnecting={connectOutlookMutation.isPending}
                isDisconnecting={disconnectOutlookMutation.isPending}
                disabled={outlookStatusQuery.isLoading}
              />
            </div>

            {ingestAddress && (
              <Card className="gap-3 rounded-xl p-8 shadow-sm">
                <div className="flex items-center gap-2">
                  <Inbox className="size-5 text-primary" />
                  <h2 className="text-xl font-semibold text-primary">
                    Reply Logging
                  </h2>
                </div>

                <p className="text-sm text-muted-foreground">
                  BCC or forward mail to this address to log the thread on its
                  record. Only mail sent here is stored; replies that match a
                  record are logged on its timeline, everything else is
                  discarded.
                </p>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    readOnly
                    value={ingestAddress}
                    className="font-mono text-sm sm:max-w-md"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(ingestAddress);
                      toast.success("Ingest address copied");
                    }}
                  >
                    <Copy className="size-4" />
                    Copy
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="mt-0">
            <div className="grid gap-6 lg:grid-cols-2">
              <IntegrationCard
                name="Google Calendar"
                description="View and manage Google events from your dashboard."
                logo={<Calendar className="size-8 text-primary" />}
                connected={Boolean(calendarStatusQuery.data?.google.connected)}
                connectedDetail={`Synced with ${calendarStatusQuery.data?.google.email ?? ""}`}
                onConnect={() => connectGoogleCalendarMutation.mutate()}
                onDisconnect={() => disconnectGoogleCalendarMutation.mutate()}
                isConnecting={connectGoogleCalendarMutation.isPending}
                isDisconnecting={disconnectGoogleCalendarMutation.isPending}
                disabled={calendarStatusQuery.isLoading}
              />

              <IntegrationCard
                name="Outlook Calendar"
                description="View and manage Outlook events from your dashboard."
                logo={<Calendar className="size-8 text-primary" />}
                connected={Boolean(calendarStatusQuery.data?.outlook.connected)}
                connectedDetail={`Synced with ${calendarStatusQuery.data?.outlook.email ?? ""}`}
                onConnect={() => connectOutlookCalendarMutation.mutate()}
                onDisconnect={() => disconnectOutlookCalendarMutation.mutate()}
                isConnecting={connectOutlookCalendarMutation.isPending}
                isDisconnecting={disconnectOutlookCalendarMutation.isPending}
                disabled={calendarStatusQuery.isLoading}
              />
            </div>
          </TabsContent>

          <TabsContent value="fax" className="mt-0">
            <div className="grid gap-6 lg:grid-cols-2">
              <IntegrationCard
                name="Eldon Fax"
                description="Send documents as faxes directly from record activities. Paste an organization API key with faxes:read and faxes:write scopes (owner only)."
                logo={<Printer className="size-8 text-primary" />}
                connected={Boolean(faxStatusQuery.data?.connected)}
                connectedDetail={`Connected with key ending in …${faxStatusQuery.data?.apiKeyLast4 ?? ""}`}
                connectLabel="Connect"
                onConnect={() => connectFaxMutation.mutate(faxApiKey.trim())}
                onDisconnect={() => disconnectFaxMutation.mutate()}
                isConnecting={connectFaxMutation.isPending}
                isDisconnecting={disconnectFaxMutation.isPending}
                disabled={!faxKeyReady}
              >
                <div className="mt-4 space-y-1.5">
                  <Label htmlFor="fax-api-key">API key</Label>
                  <Input
                    id="fax-api-key"
                    type="password"
                    placeholder={
                      faxStatusQuery.data?.connected
                        ? "Paste a new key to rotate"
                        : "sk_live_..."
                    }
                    value={faxApiKey}
                    onChange={(event) => setFaxApiKey(event.target.value)}
                  />
                  {faxStatusQuery.data?.connected && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() =>
                        connectFaxMutation.mutate(faxApiKey.trim())
                      }
                      disabled={!faxKeyReady || connectFaxMutation.isPending}
                    >
                      Rotate key
                    </Button>
                  )}
                </div>
              </IntegrationCard>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
