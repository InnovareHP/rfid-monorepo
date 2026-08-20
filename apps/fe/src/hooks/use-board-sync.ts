import { authClient } from "@/lib/auth-client";
import { boardQueryKey } from "@/lib/helper/board-query-key";
import { connectSocket, setTokenGenerator } from "@/lib/socket-io/socket";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Socket } from "socket.io-client";

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

    const handleUpdate = ({ recordId, fieldName, value, moduleType }: any) => {
      patchRows(moduleType, (rows) =>
        rows.map((r: any) =>
          r.id === recordId
            ? { ...r, [fieldName]: value, has_notification: true }
            : r
        )
      );
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

    // Geocoding derives several columns at once, so the payload is a field-name map
    const handleUpdateLocation = ({ recordId, data, moduleType }: any) => {
      patchRows(moduleType, (rows) =>
        rows.map((r: any) =>
          r.id === recordId ? { ...r, ...data, has_notification: true } : r
        )
      );
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
                ...(reason.fieldName ? { [reason.fieldName]: reason.value } : {}),
                ...(actionDate.fieldName
                  ? { [actionDate.fieldName]: actionDate.value }
                  : {}),
                has_notification: true,
              }
            : r
        )
      );
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
    const handleCsvImportComplete = ({ moduleType }: any) => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(moduleType) });
      queryClient.invalidateQueries({ queryKey: ["board-stats"] });
    };

    const handlers: Record<string, (payload: any) => void> = {
      "board:update": handleUpdate,
      "board:record-created": handleCreated,
      "board:record-deleted": handleDelete,
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

    // A reconnect swaps the socket, so rebinding goes through here rather than
    // React state: this hook sits in the team layout and setState would re-render
    // every sidebar and page under it on each connect_error.
    const bind = (next: Socket) => {
      if (bound === next) return;
      unbind();
      bound = next;
      for (const [event, handler] of Object.entries(handlers)) {
        next.on(event, handler);
      }
    };

    let cancelled = false;

    const connect = async () => {
      const token = await generateToken();
      if (!token || cancelled) return;
      bind(await connectSocket(token, bind));
    };
    connect();

    return () => {
      cancelled = true;
      unbind();
    };
  }, [queryClient]);
}
