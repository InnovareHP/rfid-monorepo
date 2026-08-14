import axios from "axios";
import { IntegrationCard } from "@/components/integrations/integration-card";
import { ProviderLogo } from "@/components/integrations/provider-logo";
import { PageHeader } from "@/components/page-header";
import {
  SegmentedTabsList,
  SegmentedTabsTrigger,
} from "@/components/segmented-tabs";
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
} from "@dashboard/ui/components/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { IntegrationTab } from "@/components/integrations/integration-tabs";
import { Calendar, Copy, Inbox, Mail, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// The single-calendar rule is enforced server-side, so its message has to reach
// the toast rather than being swallowed by a generic failure string.
const errorMessage = (error: unknown, fallback: string) =>
  (axios.isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message
    : null) ?? fallback;

export default function IntegrationPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const search = useSearch({ from: "/_team/$team/integrations" });

  // Inbound ingest is optional infrastructure: the card only exists once it is set up.
  const ingestAddressQuery = useQuery({
    queryKey: ["email-ingest-address"],
    queryFn: getEmailIngestAddress,
    retry: false,
    staleTime: 1000 * 60 * 60,
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
    onError: (error) => {
      toast.error(
        errorMessage(error, "Failed to start Google Calendar connection")
      );
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
    onError: (error) => {
      toast.error(
        errorMessage(error, "Failed to start Outlook Calendar connection")
      );
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
      toast.error("Failed to connect Gmail");
    }
  }, [queryClient, search?.gmail]);

  useEffect(() => {
    if (search?.outlook === "connected") {
      toast.success("Outlook connected successfully!");
      queryClient.invalidateQueries({ queryKey: ["outlook-status"] });
    } else if (search?.outlook === "error") {
      toast.error("Failed to connect Outlook");
    }
  }, [queryClient, search?.outlook]);

  useEffect(() => {
    if (search?.google_calendar === "connected") {
      toast.success("Google Calendar connected successfully!");
      queryClient.invalidateQueries({ queryKey: ["calendar-status"] });
    } else if (search?.google_calendar === "error") {
      toast.error("Failed to connect Google Calendar");
    }
  }, [queryClient, search?.google_calendar]);

  useEffect(() => {
    if (search?.outlook_calendar === "connected") {
      toast.success("Outlook Calendar connected successfully!");
      queryClient.invalidateQueries({ queryKey: ["calendar-status"] });
    } else if (search?.outlook_calendar === "error") {
      toast.error("Failed to connect Outlook Calendar");
    }
  }, [queryClient, search?.outlook_calendar]);

  // A provider redirect names itself but not the tab it belongs to, so an absent
  // tab resolves to the one the returning provider lives on: connecting a
  // calendar should land on Calendar rather than bouncing back to Email.
  const activeTab: IntegrationTab =
    search.tab ??
    (search.google_calendar || search.outlook_calendar ? "calendar" : "email");

  const faxKeyReady = faxApiKey.trim().length >= 10;

  // Bookings write to one calendar, so the other provider stays unavailable
  // until this one is disconnected.
  const googleCalendarConnected = Boolean(
    calendarStatusQuery.data?.google.connected
  );
  const outlookCalendarConnected = Boolean(
    calendarStatusQuery.data?.outlook.connected
  );

  return (
    <div className="page-style w-full">
      <div>
        <PageHeader
          title="Integrations"
          description="Connect your external tools and accounts."
        />

        {/* Tab lives in the url so a provider redirect can land on the right one
            and a shared link opens where it was left. replace keeps switching
            tabs out of the back button. */}
        <Tabs
          value={activeTab}
          onValueChange={(tab) =>
            navigate({
              to: ".",
              search: (prev) => ({ ...prev, tab: tab as IntegrationTab }),
              replace: true,
            })
          }
          className="space-y-6"
        >
          <SegmentedTabsList>
            <SegmentedTabsTrigger value="email">Email</SegmentedTabsTrigger>
            <SegmentedTabsTrigger value="calendar">
              Calendar
            </SegmentedTabsTrigger>
            <SegmentedTabsTrigger value="fax">Fax</SegmentedTabsTrigger>
          </SegmentedTabsList>

          <TabsContent value="email" className="mt-0 space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <IntegrationCard
                name="Google Mail"
                description="Send activity emails from your Gmail account."
                logo={
                  <ProviderLogo
                    src="/branding/Integrations/gmail.png"
                    alt="Gmail"
                    fallback={<Mail className="size-8 text-primary" />}
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
                    fallback={<Mail className="size-8 text-primary" />}
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
                logo={
                  <ProviderLogo
                    src="/branding/Integrations/google-calendar.png"
                    alt="Google Calendar"
                    fallback={<Calendar className="size-8 text-primary" />}
                  />
                }
                connected={googleCalendarConnected}
                connectedDetail={`Synced with ${calendarStatusQuery.data?.google.email ?? ""}`}
                onConnect={() => connectGoogleCalendarMutation.mutate()}
                onDisconnect={() => disconnectGoogleCalendarMutation.mutate()}
                isConnecting={connectGoogleCalendarMutation.isPending}
                isDisconnecting={disconnectGoogleCalendarMutation.isPending}
                disabled={calendarStatusQuery.isLoading || outlookCalendarConnected}
                disabledHint={
                  outlookCalendarConnected
                    ? "Disconnect Outlook Calendar first — only one calendar can be connected."
                    : undefined
                }
              />

              <IntegrationCard
                name="Outlook Calendar"
                description="View and manage Outlook events from your dashboard."
                // Microsoft ships no separate calendar mark, so Outlook's own
                // icon stands for both its mail and its calendar.
                logo={
                  <ProviderLogo
                    src="/branding/Integrations/outlook.png"
                    alt="Outlook Calendar"
                    fallback={<Calendar className="size-8 text-primary" />}
                  />
                }
                connected={outlookCalendarConnected}
                connectedDetail={`Synced with ${calendarStatusQuery.data?.outlook.email ?? ""}`}
                onConnect={() => connectOutlookCalendarMutation.mutate()}
                onDisconnect={() => disconnectOutlookCalendarMutation.mutate()}
                isConnecting={connectOutlookCalendarMutation.isPending}
                isDisconnecting={disconnectOutlookCalendarMutation.isPending}
                disabled={calendarStatusQuery.isLoading || googleCalendarConnected}
                disabledHint={
                  googleCalendarConnected
                    ? "Disconnect Google Calendar first — only one calendar can be connected."
                    : undefined
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="fax" className="mt-0">
            <div className="grid gap-6 lg:grid-cols-2">
              <IntegrationCard
                name="Eldon Fax"
                description="Send documents as faxes directly from record activities. Paste an organization API key with faxes:read and faxes:write scopes (owner only)."
                logo={
                  <ProviderLogo
                    src="/branding/Integrations/eldonfax.png"
                    alt="Eldon Fax"
                    fallback={<Printer className="size-8 text-primary" />}
                  />
                }
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
