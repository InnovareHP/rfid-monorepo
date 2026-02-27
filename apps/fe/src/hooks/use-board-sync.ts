import { authClient } from "@/lib/auth-client";
import { connectSocket, setTokenGenerator } from "@/lib/socket-io/socket";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";

async function generateToken(): Promise<string | null> {
  const { data } = await authClient.oneTimeToken.generate();
  return data?.token ?? null;
}

function getQueryKey(moduleType?: string): string[] {
  return moduleType === "REFERRAL" ? ["referrals"] : ["leads"];
}

export function useBoardSync() {
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    setTokenGenerator(generateToken);

    const connect = async () => {
      const token = await generateToken();
      if (!token) return;

      const sock = await connectSocket(token);
      setSocket(sock);
    };
    connect();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = ({ recordId, fieldName, value, moduleType }: any) => {
      queryClient.setQueriesData(
        { queryKey: getQueryKey(moduleType), exact: false },
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

    const handleCreated = ({ record, moduleType }: any) => {
      queryClient.setQueriesData(
        { queryKey: getQueryKey(moduleType), exact: false },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: any, index: number) =>
              index === 0 ? { ...page, data: [record, ...page.data] } : page
            ),
          };
        }
      );
    };

    const handleDelete = ({ recordIds, moduleType }: any) => {
      queryClient.setQueriesData(
        { queryKey: getQueryKey(moduleType), exact: false },
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

    const handleUpdateLocation = ({ recordId, data, moduleType }: any) => {
      queryClient.setQueriesData(
        { queryKey: getQueryKey(moduleType), exact: false },
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

    const handleUpdateNotificationState = ({ recordId, moduleType }: any) => {
      queryClient.setQueriesData(
        { queryKey: getQueryKey(moduleType), exact: false },
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
  }, [queryClient, socket]);
}
