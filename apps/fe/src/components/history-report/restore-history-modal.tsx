import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { formatCapitalize, formatDateTime } from "@/lib/utils";
import { AlertTriangle, ArrowRight, Loader2, RotateCcw, X } from "lucide-react";

interface RestoreHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historyItem: {
    id: string;
    leadId: string;
    action: string;
    entityType: string;
    old_value?: string;
    new_value?: string;
    created_at: string;
    created_by: string;
  } | null;
  onConfirm: (leadId: string, historyId: string, eventType: string) => Promise<void>;
  isRestoring: boolean;
}

export function RestoreHistoryModal({
  open,
  onOpenChange,
  historyItem,
  onConfirm,
  isRestoring,
}: RestoreHistoryModalProps) {
  if (!open || !historyItem) return null;

  const handleConfirm = async () => {
    await onConfirm(historyItem.leadId, historyItem.id, historyItem.action);
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (!isRestoring) {
      onOpenChange(false);
    }
  };

  const isDelete = historyItem.action.toLowerCase() === "delete";
  const isUpdate = historyItem.action.toLowerCase() === "update";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
      />
      <Card className="relative z-[100] w-full max-w-2xl mx-4 shadow-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20">
              <RotateCcw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-orange-600 dark:text-orange-400">
                Restore History
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0"
              disabled={isRestoring}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="space-y-4 pt-4">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span>
                Are you sure you want to restore this {formatCapitalize(historyItem.action)} action?
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Action Type
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatCapitalize(historyItem.action)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Entity Type
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {historyItem.entityType}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Changed By
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {historyItem.created_by}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Changed At
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatDateTime(historyItem.created_at)}
                </p>
              </div>
            </div>

            {isUpdate && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
                  This will revert the change:
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded font-mono">
                    {historyItem.old_value || "(empty)"}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded font-mono">
                    {historyItem.new_value || "(empty)"}
                  </span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Restoring will change it back to: <span className="font-semibold">{historyItem.old_value || "(empty)"}</span>
                </p>
              </div>
            )}

            {isDelete && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">
                  This will restore a deleted record
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  The {historyItem.entityType} that was deleted will be restored with its previous data.
                </p>
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isRestoring}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isRestoring}
            className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
          >
            {isRestoring ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                Restore
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
