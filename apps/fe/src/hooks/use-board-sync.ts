import { authClient } from "@/lib/auth-client";
import { connectSocket, setTokenGenerator } from "@/lib/socket-io/socket";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

async function generateToken(): Promise<string | null> {
  const { data } = await authClient.oneTimeToken.generate();
  return data?.token ?? null;
}

const MODULE_QUERY_KEYS: Record<string, string> = {
  LEAD: "leads",
  REFERRAL: "referrals",
  CONTACT: "contacts",
  COMPANY: "companies",
};

function getQueryKey(moduleType?: string): string[] {
  return [MODULE_QUERY_KEYS[moduleType ?? "LEAD"] ?? "leads"];
}

export function useBoardSync() {
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    setTokenGenerator(generateToken);

    const connect = async () => {
      const token = await generateToken();
      if (!token) return;

      const sock = await connectSocket(token, setSocket);
      setSocket(sock);
    };
    connect();
  }, []);

  useEffect(() => {
    if (!socket) return;

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

    const handleUpdateLocation = ({ recordId, data, moduleType }: any) => {
      patchRows(moduleType, (rows) =>
        rows.map((r: any) =>
          r.id === recordId
            ? { ...r, [data.key]: data.value, has_notification: true }
            : r
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

    // Listeners
    socket.on("board:update", handleUpdate);
    socket.on("board:record-created", handleCreated);
    socket.on("board:record-deleted", handleDelete);
    socket.on("board:record-notification-state", handleUpdateNotificationState);
    socket.on("board:update-location", handleUpdateLocation);
    socket.on("board:update-status", handleUpdateStatus);
    socket.on("board:column-created", handleColumnCreated);
    socket.on("board:column-deleted", handleColumnDeleted);
    socket.on("board:activity-created", handleActivityChanged);
    socket.on("board:activity-updated", handleActivityChanged);
    socket.on("board:csv-import-complete", handleCsvImportComplete);

    return () => {
      socket.off("board:update", handleUpdate);
      socket.off("board:record-created", handleCreated);
      socket.off("board:record-deleted", handleDelete);
      socket.off(
        "board:record-notification-state",
        handleUpdateNotificationState
      );
      socket.off("board:update-location", handleUpdateLocation);
      socket.off("board:update-status", handleUpdateStatus);
      socket.off("board:column-created", handleColumnCreated);
      socket.off("board:column-deleted", handleColumnDeleted);
      socket.off("board:activity-created", handleActivityChanged);
      socket.off("board:activity-updated", handleActivityChanged);
      socket.off("board:csv-import-complete", handleCsvImportComplete);
    };
  }, [queryClient, socket]);
}
