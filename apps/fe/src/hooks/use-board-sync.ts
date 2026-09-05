import { authClient } from "@/lib/auth-client";
import { boardQueryKey, historyQueryKey } from "@/lib/helper/board-query-key";
import { connectSocket, setTokenGenerator } from "@/lib/socket-io/socket";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Socket } from "socket.io-client";
import { toast } from "sonner";

async function generateToken(): Promise<string | null> {
  const { data } = await authClient.oneTimeToken.generate();
  return data?.token ?? null;
}

function getQueryKey(moduleType?: string): string[] {
  return boardQueryKey(moduleType ?? "LEAD");
}

export function useBoardSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    setTokenGenerator(generateToken);

    const patchRows = (
      moduleType: string | undefined,
      patch: (rows: any[]) => any[]
    ) => {
      queryClient.setQueriesData(
        { queryKey: getQueryKey(moduleType), exact: false },
        (old: any) => {
          if (!old?.data) return old;
          return { ...old, data: patch(old.data) };
        }
      );
      queryClient.invalidateQueries({ queryKey: ["board-stats"] });
    };

    // A cell written elsewhere also wrote a history row, so an open record
    // timeline is stale even though its row was patched in place.
    const invalidateHistory = (moduleType: string | undefined, recordId: string) => {
      queryClient.invalidateQueries({
        queryKey: historyQueryKey(moduleType ?? "LEAD", recordId),
      });
    };

    const handleUpdate = ({ recordId, fieldName, value, moduleType }: any) => {
      patchRows(moduleType, (rows) =>
        rows.map((r: any) =>
          r.id === recordId
            ? { ...r, [fieldName]: value, has_notification: true }
            : r
        )
      );
      invalidateHistory(moduleType, recordId);
    };

    const handleCreated = ({ record, moduleType }: any) => {
      patchRows(moduleType, (rows) =>
        rows.some((r: any) => r.id === record.id)
          ? rows
          : [{ ...record, has_notification: true }, ...rows]
      );
    };

    const handleDelete = ({ recordIds, moduleType }: any) => {
      const ids: string[] = Array.isArray(recordIds) ? recordIds : [recordIds];
      patchRows(moduleType, (rows) =>
        rows.filter((r: any) => !ids.includes(r.id))
      );
    };

    // A restored row was never streamed and its cells are rebuilt from EAV, so
    // refetch that board instead of reinserting a row the client cannot shape.
    const handleRestored = ({ moduleType }: any) => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(moduleType) });
      queryClient.invalidateQueries({ queryKey: ["board-stats"] });
    };

    // Geocoding derives several columns at once, so the payload is a field-name map
    const handleUpdateLocation = ({ recordId, data, moduleType }: any) => {
      patchRows(moduleType, (rows) =>
        rows.map((r: any) =>
          r.id === recordId ? { ...r, ...data, has_notification: true } : r
        )
      );
      invalidateHistory(moduleType, recordId);
    };

    const handleUpdateNotificationState = ({ recordId, moduleType }: any) => {
      patchRows(moduleType, (rows) =>
        rows.map((r: any) =>
          r.id === recordId ? { ...r, has_notification: false } : r
        )
      );
    };

    const handleUpdateStatus = ({
      recordId,
      fieldName,
      value,
      moduleType,
      reason,
      actionDate,
    }: any) => {
      patchRows(moduleType, (rows) =>
        rows.map((r: any) =>
          r.id === recordId
            ? {
                ...r,
                [fieldName]: value,
                ...(reason.fieldName
                  ? { [reason.fieldName]: reason.value }
                  : {}),
                ...(actionDate.fieldName
                  ? { [actionDate.fieldName]: actionDate.value }
                  : {}),
                has_notification: true,
              }
            : r
        )
      );
      invalidateHistory(moduleType, recordId);
    };

    const handleColumnCreated = ({ column, moduleType }: any) => {
      queryClient.setQueriesData(
        { queryKey: getQueryKey(moduleType), exact: false },
        (old: any) => {
          if (!old?.columns) return old;
          if (old.columns.some((c: any) => c.id === column.id)) return old;
          return { ...old, columns: [...old.columns, column] };
        }
      );
    };

    const handleColumnDeleted = ({ columnId, moduleType }: any) => {
      queryClient.setQueriesData(
        { queryKey: getQueryKey(moduleType), exact: false },
        (old: any) => {
          if (!old?.columns) return old;
          return {
            ...old,
            columns: old.columns.filter((c: any) => c.id !== columnId),
          };
        }
      );
    };

    // Activities are paginated, so refetch the record's timeline instead of patching pages
    const handleActivityChanged = ({ recordId }: any) => {
      queryClient.invalidateQueries({ queryKey: ["activities", recordId] });
    };

    // Bulk import writes rows the socket never streamed, so refetch that board
    const handleCsvImportComplete = ({
      moduleType,
      recordsImported,
      duplicatesSkipped,
      nearMatches,
      unlinkedCells,
    }: any) => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(moduleType) });
      queryClient.invalidateQueries({ queryKey: ["board-stats"] });

      // The counts only exist once the job runs, long after the import panel
      // reported the upload as queued, so they are announced here instead.
      const dropped = (duplicatesSkipped ?? 0) + (nearMatches ?? 0);

      // An unlinked cell is the quieter failure of the two: the row imports,
      // but with no link, so every report built on that relation stays empty
      // and nothing says why.
      if (unlinkedCells > 0) {
        toast.warning(
          `Import finished — ${unlinkedCells} cell(s) could not be linked`,
          {
            description:
              "They named a record that does not exist yet, so those links are missing. Reports that group by them will look empty.",
          }
        );
        return;
      }

      if (dropped > 0) {
        toast.warning(`Import finished — ${dropped} row(s) skipped`, {
          description: "Rows naming a record you already have were not added.",
        });
        return;
      }

      if (recordsImported > 0) {
        toast.success(`Import finished — ${recordsImported} record(s) added`);
      }
    };

    const handlers: Record<string, (payload: any) => void> = {
      "board:update": handleUpdate,
      "board:record-created": handleCreated,
      "board:record-deleted": handleDelete,
      "board:record-restored": handleRestored,
      "board:record-notification-state": handleUpdateNotificationState,
      "board:update-location": handleUpdateLocation,
      "board:update-status": handleUpdateStatus,
      "board:column-created": handleColumnCreated,
      "board:column-deleted": handleColumnDeleted,
      "board:activity-created": handleActivityChanged,
      "board:activity-updated": handleActivityChanged,
      "board:csv-import-complete": handleCsvImportComplete,
    };

    let bound: Socket | null = null;

    const unbind = () => {
      if (!bound) return;
      for (const [event, handler] of Object.entries(handlers)) {
        bound.off(event, handler);
      }
      bound = null;
    };

    const bind = (next: Socket) => {
      if (bound === next) return;
      unbind();
      bound = next;
      for (const [event, handler] of Object.entries(handlers)) {
        next.on(event, handler);
      }
    };

    // The socket instance is stable across reconnects now that the token is
    // minted per attempt, so listeners bind once.
    bind(connectSocket());

    return () => {
      unbind();
    };
  }, [queryClient]);
}
