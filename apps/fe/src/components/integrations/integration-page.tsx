import {
  disconnectGmail,
  disconnectOutlook,
  getGmailAuthUrl,
  getGmailStatus,
  getOutlookAuthUrl,
  getOutlookStatus,
} from "@/services/lead/lead-service";
import {
  disconnectGoogleCalendar,
  disconnectOutlookCalendar,
  getCalendarConnectionStatus,
  getGoogleCalendarAuthUrl,
  getOutlookCalendarAuthUrl,
} from "@/services/calendar/calendar-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Separator } from "@dashboard/ui/components/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dashboard/ui/components/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { Calendar, Link, Loader2, Mail, PlugZap, Unlink } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

export default function IntegrationPage() {
  const queryClient = useQueryClient();
  const search = useSearch({ strict: false }) as Record<string, string>;

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

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-gray-50 via-blue-50/20 to-gray-50">
      <div className="sticky top-0 z-50 border-b-2 border-blue-200 bg-white shadow-md">
        <div className="mx-auto max-w-7xl p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg">
              <PlugZap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Integrations
              </h1>
              <p className="mt-0.5 text-sm text-gray-600">
                Connect your external tools and accounts
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl p-6 sm:p-8">
        <Tabs defaultValue="email" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:w-[320px]">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          {/* ---- Email Tab ---- */}
          <TabsContent value="email" className="mt-0">
            <Card className="border-2 border-gray-300 shadow-sm">
              <CardHeader className="border-b-2 border-gray-300 bg-blue-50">
                <div className="flex items-center gap-2">
                  <Link className="h-5 w-5 text-blue-600" />
                  <div>
                    <CardTitle className="text-blue-900">Connected Accounts</CardTitle>
                    <CardDescription>
                      Connect external email accounts to enhance your workflow
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-red-200 bg-red-50">
                      <Mail className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Gmail</p>
                      {gmailStatusQuery.data?.connected ? (
                        <p className="text-sm text-gray-600">
                          Connected as{" "}
                          <span className="font-medium text-blue-600">
                            {gmailStatusQuery.data.email}
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Send activity emails from your Gmail account
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {gmailStatusQuery.data?.connected && (
                      <Badge className="border-2 border-green-300 bg-green-100 font-semibold text-green-700">
                        Connected
                      </Badge>
                    )}

                    {gmailStatusQuery.data?.connected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => disconnectGmailMutation.mutate()}
                        disabled={disconnectGmailMutation.isPending}
                      >
                        {disconnectGmailMutation.isPending ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Unlink className="mr-1 h-4 w-4" />
                        )}
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-300 hover:bg-blue-50"
                        onClick={() => connectGmailMutation.mutate()}
                        disabled={connectGmailMutation.isPending || gmailStatusQuery.isLoading}
                      >
                        {connectGmailMutation.isPending ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Link className="mr-1 h-4 w-4" />
                        )}
                        Connect Gmail
                      </Button>
                    )}
                  </div>
                </div>

                <Separator className="bg-gray-300" />

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-blue-200 bg-blue-50">
                      <Mail className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Outlook</p>
                      {outlookStatusQuery.data?.connected ? (
                        <p className="text-sm text-gray-600">
                          Connected as{" "}
                          <span className="font-medium text-blue-600">
                            {outlookStatusQuery.data.email}
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Send activity emails from your Outlook account
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {outlookStatusQuery.data?.connected && (
                      <Badge className="border-2 border-green-300 bg-green-100 font-semibold text-green-700">
                        Connected
                      </Badge>
                    )}

                    {outlookStatusQuery.data?.connected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => disconnectOutlookMutation.mutate()}
                        disabled={disconnectOutlookMutation.isPending}
                      >
                        {disconnectOutlookMutation.isPending ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Unlink className="mr-1 h-4 w-4" />
                        )}
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-300 hover:bg-blue-50"
                        onClick={() => connectOutlookMutation.mutate()}
                        disabled={
                          connectOutlookMutation.isPending || outlookStatusQuery.isLoading
                        }
                      >
                        {connectOutlookMutation.isPending ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Link className="mr-1 h-4 w-4" />
                        )}
                        Connect Outlook
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---- Calendar Tab ---- */}
          <TabsContent value="calendar" className="mt-0">
            <Card className="border-2 border-gray-300 shadow-sm">
              <CardHeader className="border-b-2 border-gray-300 bg-blue-50">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <CardTitle className="text-blue-900">
                      Calendar Integrations
                    </CardTitle>
                    <CardDescription>
                      Connect calendar accounts to view and manage events from your dashboard
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                {/* Google Calendar */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-blue-200 bg-blue-50">
                      <Calendar className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Google Calendar</p>
                      {calendarStatusQuery.data?.google.connected ? (
                        <p className="text-sm text-gray-600">
                          Connected as{" "}
                          <span className="font-medium text-blue-600">
                            {calendarStatusQuery.data.google.email}
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Sync appointments and follow-up schedules
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {calendarStatusQuery.data?.google.connected && (
                      <Badge className="border-2 border-green-300 bg-green-100 font-semibold text-green-700">
                        Connected
                      </Badge>
                    )}

                    {calendarStatusQuery.data?.google.connected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => disconnectGoogleCalendarMutation.mutate()}
                        disabled={disconnectGoogleCalendarMutation.isPending}
                      >
                        {disconnectGoogleCalendarMutation.isPending ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Unlink className="mr-1 h-4 w-4" />
                        )}
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-300 hover:bg-blue-50"
                        onClick={() => connectGoogleCalendarMutation.mutate()}
                        disabled={
                          connectGoogleCalendarMutation.isPending ||
                          calendarStatusQuery.isLoading
                        }
                      >
                        {connectGoogleCalendarMutation.isPending ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Link className="mr-1 h-4 w-4" />
                        )}
                        Connect Google
                      </Button>
                    )}
                  </div>
                </div>

                <Separator className="bg-gray-300" />

                {/* Outlook Calendar */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-blue-200 bg-blue-50">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Outlook Calendar</p>
                      {calendarStatusQuery.data?.outlook.connected ? (
                        <p className="text-sm text-gray-600">
                          Connected as{" "}
                          <span className="font-medium text-blue-600">
                            {calendarStatusQuery.data.outlook.email}
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Manage schedule sync across Microsoft accounts
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {calendarStatusQuery.data?.outlook.connected && (
                      <Badge className="border-2 border-green-300 bg-green-100 font-semibold text-green-700">
                        Connected
                      </Badge>
                    )}

                    {calendarStatusQuery.data?.outlook.connected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => disconnectOutlookCalendarMutation.mutate()}
                        disabled={disconnectOutlookCalendarMutation.isPending}
                      >
                        {disconnectOutlookCalendarMutation.isPending ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Unlink className="mr-1 h-4 w-4" />
                        )}
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-300 hover:bg-blue-50"
                        onClick={() => connectOutlookCalendarMutation.mutate()}
                        disabled={
                          connectOutlookCalendarMutation.isPending ||
                          calendarStatusQuery.isLoading
                        }
                      >
                        {connectOutlookCalendarMutation.isPending ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Link className="mr-1 h-4 w-4" />
                        )}
                        Connect Outlook
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
