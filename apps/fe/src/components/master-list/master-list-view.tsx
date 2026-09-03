import { boardQueryKey } from "@/lib/helper/board-query-key";
import {
  getLeadTimeline,
  getSpecificLead,
  restoreLeadHistory,
  seenLeads,
} from "@/services/lead/lead-service";
import {
  getReferralTimeline,
  getSpecificReferral,
  seenReferrals,
} from "@/services/referral/referral-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { ScrollArea } from "@dashboard/ui/components/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@dashboard/ui/components/tabs";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileText,
  Lightbulb,
} from "lucide-react";
import * as React from "react";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { RestoreHistoryModal } from "../history-report/restore-history-modal";
import { EditableCell } from "../reusable-table/editable-cell";
import { ActivityTab } from "./activity-tab";
import { FollowUpSuggestions } from "./follow-up-suggestions";
import { HistoryTimelineItem } from "./history-timeline-item";
import { useEntitlement } from "@/hooks/use-entitlement";
import { useRouteContext } from "@tanstack/react-router";
import { RelatedRecords } from "../crm-list/related-records";

function serializeValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function MasterListView({
  leadId,
  hasNotification = false,
  isReferral,
  initialTab = "details",
  open = false,
  setOpen,
}: {
  leadId: string;
  isReferral: boolean;
  hasNotification?: boolean;
  initialTab?: "details" | "history" | "suggestions" | "activities";
  open?: boolean;
  setOpen?: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState(initialTab);

  const { activeOrganizationId } = useRouteContext({ from: "__root__" }) as {
    activeOrganizationId: string;
  };
  const canUseAi = useEntitlement(activeOrganizationId).has("ai");

  const hasSeenRef = React.useRef(false);
  const prevLeadIdRef = React.useRef(leadId);

  if (prevLeadIdRef.current !== leadId) {
    hasSeenRef.current = false;
    prevLeadIdRef.current = leadId;
  }

  const [restoreModalOpen, setRestoreModalOpen] = React.useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] =
    React.useState<any>(null);
  const [isRestoring, setIsRestoring] = React.useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [isReferral ? "referral" : "lead", leadId],
    enabled: open,
    queryFn: () =>
      isReferral
        ? getSpecificReferral(leadId, "REFERRAL")
        : getSpecificLead(leadId, "LEAD"),
  });

  const {
    data: historyData,
    isLoading: historyLoading,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: [isReferral ? "referral-history" : "lead-history", leadId],
    enabled: open && activeTab === "history",
    queryFn: ({ pageParam = 1 }) =>
      isReferral
        ? getReferralTimeline(leadId, 15, pageParam as number)
        : getLeadTimeline(leadId, 15, pageParam as number),
    getNextPageParam: (lastPage, pages) => {
      const pageSize = 15;

      return lastPage.data.length === pageSize ? pages.length + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const { detailColumns, record } = useMemo(() => {
    const columns = (data?.columns ?? []) as {
      id: string;
      name: string;
      type: string;
    }[];
    return {
      detailColumns: columns.filter(
        (col) =>
          col.name !== "History" &&
          !["TIMELINE", "REFERRAL_LINK"].includes(col.type)
      ),
      record: (data?.data ?? {}) as Record<string, unknown>,
    };
  }, [data]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen?.(next);

      if (hasNotification) {
        const markSeen = isReferral ? seenReferrals : seenLeads;
        markSeen(leadId).then(() => {
          hasSeenRef.current = true;
        });
        hasSeenRef.current = true;
      }
      if (next) setActiveTab(initialTab);
    },
    [initialTab, hasNotification, leadId, hasSeenRef]
  );

  const handleOpenRestoreModal = (historyItem: any) => {
    setSelectedHistoryItem({
      id: historyItem.id,
      leadId: leadId,
      action: historyItem.action,
      entityType: isReferral ? "Referral" : "Lead",
      oldValue: historyItem.oldValue,
      newValue: historyItem.newValue,
      createdAt: historyItem.createdAt,
      createdBy: historyItem.createdBy,
    });
    setRestoreModalOpen(true);
  };

  const handleRestoreHistory = async (
    leadId: string,
    historyId: string,
    eventType: string
  ) => {
    setIsRestoring(true);
    try {
      await restoreLeadHistory(leadId, historyId, eventType, isReferral ? "REFERRAL" : "LEAD");
      toast.success("History restored successfully");

      await queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      await queryClient.invalidateQueries({ queryKey: boardQueryKey("LEAD") });
      await queryClient.invalidateQueries({
        queryKey: ["lead-history", leadId],
      });
    } catch (error) {
      toast.error("Failed to restore history");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent variant="shell" className="max-w-5xl">
          <div className="shrink-0 border-b bg-table-header px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                  <Building2 className="size-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold text-foreground">
                    {serializeValue(record.recordName) !== "—"
                      ? String(record.recordName)
                      : isReferral
                        ? "Referral Details"
                        : "Facility Details"}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {isReferral ? "Referral" : "Facility"} record
                  </p>
                </div>
              </div>

              {data?.data.Status && (
                <Badge
                  variant="outline"
                  className="flex items-center gap-1.5 border-success/30 bg-success/10 px-3 py-1.5 font-medium text-success"
                >
                  <CheckCircle2 className="size-3.5" />
                  {data.data.Status}
                </Badge>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 w-full animate-pulse rounded-lg border bg-muted"
                  />
                ))}
              </div>
            </div>
          ) : isError ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-sm">
                <div className="mb-2 font-semibold text-destructive">
                  Failed to load referral
                </div>
                <div className="text-destructive">
                  {(error as Error)?.message || "Something went wrong."}
                </div>
              </div>
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(v) =>
                setActiveTab(
                  v as "details" | "history" | "suggestions" | "activities"
                )
              }
              className="flex min-h-0 w-full flex-1 flex-col"
            >
              <div className="shrink-0 border-b bg-table-header px-4 overflow-x-auto sm:px-6">
                <TabsList className="bg-transparent border-b-0">
                  <TabsTrigger
                    value="details"
                    className="rounded-none transition-colors data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-primary"
                  >
                    <FileText className="mr-2 size-4" />
                    Details
                  </TabsTrigger>

                  <TabsTrigger
                    value="history"
                    className="rounded-none transition-colors data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-primary"
                  >
                    <Clock className="mr-2 size-4" />
                    History
                  </TabsTrigger>

                  {canUseAi && (
                    <TabsTrigger
                      value="suggestions"
                      className="rounded-none transition-colors data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-primary"
                    >
                      <Lightbulb className="mr-2 size-4" />
                      Suggestions
                    </TabsTrigger>
                  )}

                  <TabsTrigger
                    value="activities"
                    className="rounded-none transition-colors data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:font-semibold data-[state=active]:text-primary"
                  >
                    <CalendarCheck className="mr-2 size-4" />
                    Activities
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="details" className="mt-0 min-h-0 flex-1">
                <ScrollArea className="h-full">
                  <div className="px-6 py-4">
                    <div className="divide-y rounded-lg border bg-card">
                      {detailColumns.map((col) => (
                        <div
                          key={col.id}
                          className="flex items-start gap-4 px-4 py-3 transition-colors hover:bg-muted"
                        >
                          <div className="w-44 shrink-0 pt-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {col.name}
                          </div>
                          <div className="flex-1 min-w-0 text-sm">
                            <EditableCell
                              id={leadId}
                              fieldKey={col.id}
                              fieldName={col.name}
                              value={serializeValue(record[col.name] ?? "")}
                              type={col.type}
                              isReferral={isReferral}
                              linkTargetId={
                                (record as any).linkIds?.[col.name]
                              }
                            />
                          </div>
                        </div>
                      ))}
                      {detailColumns.length === 0 && (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                          No fields configured yet.
                        </p>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Related records
                      </span>
                      <RelatedRecords recordId={leadId} />
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="history" className="mt-0 min-h-0 flex-1">
                <ScrollArea className="h-full px-4 py-4 sm:px-6">
                  {historyLoading && (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-24 w-full animate-pulse rounded-lg bg-muted"
                        />
                      ))}
                    </div>
                  )}

                  {historyData &&
                    historyData.pages.flatMap((p) => p.data).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className="mb-3 rounded-full bg-muted p-4">
                          <Clock className="size-8 text-muted-foreground" />
                        </div>
                        <p className="text-center font-medium text-muted-foreground">
                          No history found
                        </p>
                      </div>
                    )}

                  {historyData && historyData.pages.length > 0 && (
                    <div className="relative">
                      <div className="absolute bottom-0 left-[19px] top-0 w-px bg-border" />

                      <div className="space-y-5">
                        {historyData.pages
                          .flatMap((page) => page.data)
                          .map((item) => (
                            <HistoryTimelineItem
                              key={item.id}
                              item={item}
                              onRestore={handleOpenRestoreModal}
                              isRestoring={isRestoring}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </ScrollArea>
                {hasNextPage && (
                  <div className="flex items-center justify-center border-t bg-muted py-4">
                    <Button variant="outline" onClick={() => fetchNextPage()}>
                      Load More
                    </Button>
                  </div>
                )}
              </TabsContent>

              {canUseAi && (
                <TabsContent value="suggestions" className="mt-0 min-h-0 flex-1">
                  <FollowUpSuggestions
                    recordId={leadId}
                    enabled={activeTab === "suggestions"}
                  />
                </TabsContent>
              )}

              <TabsContent value="activities" className="mt-0 min-h-0 flex-1">
                <ActivityTab
                  recordId={leadId}
                  enabled={activeTab === "activities"}
                  moduleType={isReferral ? "REFERRAL" : "LEAD"}
                />
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="border-t bg-muted px-6 py-4">
            <Button variant="outline" onClick={() => setOpen?.(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RestoreHistoryModal
        open={restoreModalOpen}
        onOpenChange={setRestoreModalOpen}
        historyItem={selectedHistoryItem}
        onConfirm={handleRestoreHistory}
        isRestoring={isRestoring}
      />
    </>
  );
}
