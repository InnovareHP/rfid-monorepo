import { connectSocket } from "@/lib/socket-io/socket";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export function useBoardSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = connectSocket();

    const handleUpdate = ({ recordId, fieldName, value }: any) => {
      queryClient.setQueriesData(
        { queryKey: ["leads"], exact: false },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: page.data.map((r: any) =>
                r.id === recordId
                  ? { ...r, [fieldName]: value, has_notification: true }
                  : r
              ),
            })),
          };
        }
      );
    };

    const handleCreated = ({ record }: any) => {
      queryClient.setQueriesData(
        { queryKey: ["leads"], exact: false },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: any, index: number) =>
              index === 0 // Prepend the new record only to the first page
                ? { ...page, data: [record, ...page.data] }
                : page
            ),
          };
        }
      );
    };

    const handleDelete = ({ recordIds }: any) => {
      queryClient.setQueriesData(
        { queryKey: ["leads"], exact: false },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: page.data.filter((r: any) => !recordIds.includes(r.id)),
            })),
          };
        }
      );
    };

    const handleUpdateLocation = ({ recordId, data }: any) => {
      queryClient.setQueriesData(
        { queryKey: ["leads"], exact: false },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: page.data.map((r: any) =>
                r.id === recordId
                  ? { ...r, [data.key]: data.value, has_notification: true }
                  : r
              ),
            })),
          };
        }
      );
    };

    const handleUpdateNotificationState = ({ recordId }: any) => {
      queryClient.setQueriesData(
        { queryKey: ["leads"], exact: false },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              data: page.data.map((r: any) =>
                r.id === recordId ? { ...r, has_notification: false } : r
              ),
            })),
          };
        }
      );
    };

    // Listeners
    socket.on("board:update", handleUpdate);
    socket.on("board:record-created", handleCreated);
    socket.on("board:record-deleted", handleDelete);
    socket.on("board:record-notification-state", handleUpdateNotificationState);

    socket.on("board:update-location", handleUpdateLocation);

    return () => {
      socket.off("board:update", handleUpdate);
      socket.off("board:record-created", handleCreated);
      socket.off("board:record-deleted", handleDelete);
      socket.off(
        "board:record-notification-state",
        handleUpdateNotificationState
      );
      socket.off("board:update-location", handleUpdateLocation);
    };
  }, [queryClient]);
}
