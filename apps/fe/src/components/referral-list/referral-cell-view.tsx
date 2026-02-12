import {
  getReferralHistory,
  getSpecificReferral,
} from "@/services/referral/referral-service";
import { formatDateTime } from "@dashboard/shared";
import { FILETYPE } from "@/lib/fe-helpers";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Clock, FileText } from "lucide-react";
import * as React from "react";
import { EditableCell } from "../reusable-table/editable-cell";

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

export function ReferralCellView({ referralId }: { referralId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState("details");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["referral", referralId],
    enabled: open,
    queryFn: () => getSpecificReferral(referralId),
  });

  const { data: historyData, isLoading: historyLoading } = useInfiniteQuery({
    queryKey: ["referral-history", referralId],
    enabled: open && activeTab === "history",
    queryFn: ({ pageParam = 1 }) =>
      getReferralHistory(referralId, 15, pageParam as number),
    getNextPageParam: (lastPage, pages) =>
      lastPage.total > 0 ? pages.length + 1 : undefined,
    initialPageParam: 1,
  });

  const columns = data?.columns ?? [];
  const formattedData = data?.data ?? {};
  const fieldTypes: Record<string, string> = {};
  const fieldIds: Record<string, string> = {};

  columns.forEach((col: any) => {
    fieldTypes[col.name] = col.type;
    fieldIds[col.name] = col.id;
  });

  const entries = Object.entries(formattedData) as [string, unknown][];

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setActiveTab("details");
      queryClient.prefetchQuery({
        queryKey: ["referral", referralId],
        queryFn: () => getSpecificReferral(referralId),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all"
        >
          <FileText className="h-4 w-4" />
          View Referral
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-gray-900">
              Referral Details
            </DialogTitle>

            <Badge className="bg-green-500 hover:bg-green-600 text-white">
              {data?.data.Status}
            </Badge>
          </div>
        </DialogHeader>

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
            onValueChange={(v) => setActiveTab(v)}
            className="w-full"
          >
            <div className="px-6 border-b">
              <TabsList className="bg-transparent border-b-0">
                <TabsTrigger
                  value="details"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Details
                </TabsTrigger>

                <TabsTrigger
                  value="history"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="details" className="mt-0">
              <ScrollArea className="h-[calc(90vh-240px)] px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {entries.map(([key, rawValue]) => {
                    const value = serializeValue(rawValue);
                    const type = fieldTypes[key] ?? "TEXT";
                    const fieldId = fieldIds[key] ?? "";

                    return (
                      <div
                        key={key}
                        className="group rounded-xl border p-4 hover:shadow-md transition-all"
                      >
                        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                          {key}
                        </div>

                        <EditableCell
                          id={referralId}
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
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-14 w-full rounded-md bg-gray-100 animate-pulse"
                      />
                    ))}
                  </div>
                )}

                {historyData &&
                  historyData.pages.flatMap((p) => p.data).length === 0 && (
                    <div className="text-center text-gray-500 py-10">
                      No history found
                    </div>
                  )}

                {historyData && historyData.pages.length > 0 && (
                  <div className="relative">
                    <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gray-200"></div>

                    <div className="space-y-6">
                      {historyData.pages
                        .flatMap((p) => p.data)
                        .map((item) => {
                          const Icon =
                            FILETYPE[item.action as keyof typeof FILETYPE];
                          return (
                            <div key={item.id} className="relative pl-12">
                              <div className="absolute left-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center border-4 border-white">
                                <Icon className="h-5 w-5 text-white" />
                              </div>

                              <div className="bg-white rounded-xl border p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                                      {item.created_by
                                        .split(" ")
                                        .map((n: string) => n[0])
                                        .join("")}
                                    </div>

                                    <div>
                                      <p className="text-sm font-semibold">
                                        {item.created_by}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {item.action.charAt(0).toUpperCase() +
                                          item.action.slice(1)}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Clock className="h-3 w-3" />
                                    {formatDateTime(item.created_at)}
                                  </div>
                                </div>

                                {item.old_value && item.new_value && (
                                  <div className="mt-3 pt-3 border-t">
                                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-2.5">
                                      {item.old_value} → {item.new_value}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="px-6 py-4 bg-gray-50 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
