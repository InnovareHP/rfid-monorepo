import { FILETYPE } from "@/lib/fe-helpers";
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
import { formatDateTime } from "@dashboard/shared";
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
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileText,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import * as React from "react";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { RestoreHistoryModal } from "../history-report/restore-history-modal";
import { EditableCell } from "../reusable-table/editable-cell";
import { ActivityTab } from "./activity-tab";
import { FollowUpSuggestions } from "./follow-up-suggestions";

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

  const { fieldTypes, fieldIds, entries } = useMemo(() => {
    const columns = data?.columns ?? [];
    const formattedData = data?.data ?? {};
    const fieldTypes: Record<string, string> = {};
    const fieldIds: Record<string, string> = {};
    columns.forEach((col: { name: string; type: string; id: string }) => {
      fieldTypes[col.name] = col.type;
      fieldIds[col.name] = col.id;
    });
    return {
      fieldTypes,
      fieldIds,
      entries: Object.entries(formattedData) as [string, unknown][],
    };
  }, [data]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen?.(next);

      if (hasNotification) {
        isReferral
          ? seenReferrals(leadId).then(() => {
              hasSeenRef.current = true;
            })
          : seenLeads(leadId).then(() => {
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
      old_value: historyItem.old_value,
      new_value: historyItem.new_value,
      created_at: historyItem.created_at,
      created_by: historyItem.created_by,
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
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
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
        <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          {/* Custom Header with Gradient */}
          <div className="px-6 pt-6 pb-5 border-b bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-gray-900">
                    {isReferral ? "Referral Details" : "Organization Details"}
                  </DialogTitle>
                  <p className="text-sm text-gray-600 mt-0.5 font-medium">
                    Complete organization information
                  </p>
                </div>
              </div>

              {data?.data.Status && (
                <Badge
                  variant="outline"
                  className="bg-emerald-100 text-emerald-700 border-emerald-300 flex items-center gap-1.5 font-semibold px-3 py-1.5 shadow-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {data.data.Status}
                </Badge>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="px-6 pb-6">
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 w-full rounded-xl border bg-gray-100 animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : isError ? (
            <div className="px-6 pb-6">
              <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm">
                <div className="font-semibold text-red-900 mb-2">
                  Failed to load referral
                </div>
                <div className="text-red-700">
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
              className="w-full"
            >
              <div className="px-6 border-b bg-gradient-to-r from-gray-50 to-slate-50">
                <TabsList className="bg-transparent border-b-0">
                  <TabsTrigger
                    value="details"
                    className="data-[state=active]:border-b-3 data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 data-[state=active]:font-bold rounded-none transition-all"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Details
                  </TabsTrigger>

                  <TabsTrigger
                    value="history"
                    className="data-[state=active]:border-b-3 data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 data-[state=active]:font-bold rounded-none transition-all"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    History
                  </TabsTrigger>

                  <TabsTrigger
                    value="suggestions"
                    className="data-[state=active]:border-b-3 data-[state=active]:border-purple-500 data-[state=active]:text-purple-600 data-[state=active]:font-bold rounded-none transition-all"
                  >
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Suggestions
                  </TabsTrigger>

                  <TabsTrigger
                    value="activities"
                    className="data-[state=active]:border-b-3 data-[state=active]:border-amber-500 data-[state=active]:text-amber-600 data-[state=active]:font-bold rounded-none transition-all"
                  >
                    <CalendarCheck className="h-4 w-4 mr-2" />
                    Activities
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="details" className="mt-0">
                <ScrollArea className="h-[calc(90vh-240px)] px-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {entries
                      .filter(
                        ([key]) =>
                          !["History", "Timeline", "id"].some((substr) =>
                            key.includes(substr)
                          )
                      )
                      .map(([key, rawValue]) => {
                        const value = serializeValue(rawValue);
                        const type = fieldTypes[key] ?? "TEXT";
                        const fieldId = fieldIds[key] ?? "";

                        return (
                          <div
                            key={key}
                            className="group rounded-xl border-2 border-gray-200 hover:border-blue-300 p-4 hover:shadow-lg transition-all bg-gradient-to-br from-white to-gray-50"
                          >
                            <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-2">
                              <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                              {key.split("_").join(" ")}
                            </div>

                            <EditableCell
                              id={leadId}
                              fieldKey={fieldId}
                              fieldName={key}
                              value={value}
                              type={type}
                              isReferral
                            />
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <ScrollArea className="h-[calc(90vh-240px)] px-6 py-4">
                  {historyLoading && (
                    <div className="space-y-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-24 w-full rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 animate-pulse"
                        />
                      ))}
                    </div>
                  )}

                  {historyData &&
                    historyData.pages.flatMap((p) => p.data).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className="p-4 rounded-full bg-gray-100 mb-3">
                          <Clock className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-center text-gray-500 font-medium">
                          No history found
                        </p>
                      </div>
                    )}

                  {historyData && historyData.pages.length > 0 && (
                    <div className="relative">
                      {/* Modern Timeline Line with Gradient */}
                      <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-indigo-400 to-purple-500"></div>

                      <div className="space-y-5">
                        {historyData.pages
                          .flatMap((p) => p.data)
                          .map((item) => {
                            const Icon =
                              FILETYPE[item.action as keyof typeof FILETYPE] ||
                              FILETYPE.update;

                            const actionColors = {
                              create: "from-green-500 to-emerald-600",
                              update: "from-blue-500 to-indigo-600",
                              delete: "from-red-500 to-rose-600",
                            };

                            const actionColor =
                              actionColors[
                                item.action.toLowerCase() as keyof typeof actionColors
                              ] || actionColors.update;

                            return (
                              <div
                                key={item.id}
                                className="relative pl-12 group"
                              >
                                {/* Enhanced Timeline Icon */}
                                <div
                                  className={`absolute left-0 w-10 h-10 rounded-full bg-gradient-to-br ${actionColor} flex items-center justify-center border-4 border-white shadow-lg group-hover:scale-110 transition-transform`}
                                >
                                  <Icon className="h-5 w-5 text-white" />
                                </div>

                                {/* Enhanced History Card */}
                                <div className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 p-5 shadow-sm hover:shadow-md transition-all">
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      <div
                                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${actionColor} text-white flex items-center justify-center text-sm font-bold shadow-md`}
                                      >
                                        {item.created_by
                                          .split(" ")
                                          .map((n: string) => n[0])
                                          .join("")
                                          .toUpperCase()}
                                      </div>

                                      <div>
                                        <p className="text-sm font-bold text-gray-900">
                                          {item.created_by}
                                        </p>
                                        <Badge
                                          variant="outline"
                                          className={`text-xs font-semibold mt-1 ${
                                            item.action.toLowerCase() ===
                                            "create"
                                              ? "bg-green-50 text-green-700 border-green-300"
                                              : item.action.toLowerCase() ===
                                                  "delete"
                                                ? "bg-red-50 text-red-700 border-red-300"
                                                : "bg-blue-50 text-blue-700 border-blue-300"
                                          }`}
                                        >
                                          {item.action.charAt(0).toUpperCase() +
                                            item.action.slice(1)}
                                        </Badge>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg font-medium">
                                        <Clock className="h-3.5 w-3.5" />
                                        {formatDateTime(item.created_at)}
                                      </div>

                                      {(item.action.toLowerCase() ===
                                        "update" ||
                                        item.action.toLowerCase() ===
                                          "delete") && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-8 gap-2 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 font-semibold transition-colors"
                                          onClick={() =>
                                            handleOpenRestoreModal(item)
                                          }
                                          disabled={isRestoring}
                                        >
                                          <RotateCcw className="h-3.5 w-3.5" />
                                          Restore
                                        </Button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Enhanced Change Display */}
                                  <div className="mt-4 pt-4 border-t-2 border-gray-100">
                                    <div className="flex items-center gap-2 mb-3">
                                      <FileText className="h-4 w-4 text-indigo-600" />
                                      <p className="text-sm font-bold text-gray-900">
                                        {item.column}
                                      </p>
                                    </div>

                                    {item.old_value && item.new_value ? (
                                      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
                                        <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-md text-sm font-semibold border border-red-300">
                                          {item.old_value}
                                        </span>
                                        <ArrowRight className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                                        <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-md text-sm font-semibold border border-green-300">
                                          {item.new_value}
                                        </span>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-700 bg-gray-100 rounded-lg p-3 font-medium border border-gray-300">
                                        {item.old_value ||
                                          item.new_value ||
                                          "No value"}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </ScrollArea>
                {hasNextPage && (
                  <div className="flex justify-center items-center py-4 border-t bg-gray-50">
                    <Button
                      variant="outline"
                      onClick={() => fetchNextPage()}
                      className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 font-semibold"
                    >
                      Load More
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="suggestions" className="mt-0">
                <FollowUpSuggestions
                  recordId={leadId}
                  enabled={activeTab === "suggestions"}
                />
              </TabsContent>

              <TabsContent value="activities" className="mt-0">
                <ActivityTab
                  recordId={leadId}
                  enabled={activeTab === "activities"}
                />
              </TabsContent>
            </Tabs>
          )}

          <DialogFooter className="px-6 py-4 bg-gradient-to-r from-gray-50 to-slate-50 border-t">
            <Button
              variant="outline"
              onClick={() => setOpen?.(false)}
              className="font-semibold hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300"
            >
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
