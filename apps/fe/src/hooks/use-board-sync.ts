import { connectSocket } from "@/lib/socket-io/socket";
import type { InfiniteData } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export function useBoardSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = connectSocket();

    const handleUpdate = ({ recordId, fieldName, value }: any) => {
      // We use plural 'setQueriesData' to hit all filtered variations of the lists
      queryClient.setQueriesData(
        { queryKey: ["leads"], exact: false },
        (old: InfiniteData<any> | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((r: any) =>
                r.id === recordId ? { ...r, [fieldName]: value } : r
              ),
            })),
          };
        }
      );

      // Do the same for referrals if needed
    };
    // 2. Handle structural changes (Refetching)
    const handleRefresh = () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
    };

    // Register listeners matching your BoardGateway methods
    socket.on("board:update", handleUpdate);
    socket.on("board:record-created", handleRefresh);
    socket.on("board:record-deleted", handleRefresh);

    // NEW: Match the notification state event if you want real-time icons/dots
    socket.on("board:record-notification-state", handleRefresh);

    return () => {
      socket.off("board:update", handleUpdate);
      socket.off("board:record-created", handleRefresh);
      socket.off("board:record-deleted", handleRefresh);
      socket.off("board:record-notification-state", handleRefresh);
    };
  }, [queryClient]);
}
