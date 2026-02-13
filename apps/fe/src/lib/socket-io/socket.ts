import { io, Socket } from "socket.io-client";
import { authClient } from "../auth-client";

// Define your events for better Type Safety later
// interface ServerToClientEvents {}
// interface ClientToServerEvents {}

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket) return socket;

  const { data, error } = await authClient.oneTimeToken.generate();

  if (error) {
    throw new Error(error.message);
  }

  socket = io(import.meta.env.VITE_API_URL, {
    withCredentials: true,
    transports: ["websocket"],
    auth: {
      token: data?.token,
    },
    upgrade: true,
  });

  socket.on("connect_error", (err) => {
    console.error("Socket error:", err.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Helper to get the current socket instance without
 * accidentally triggering a new connection
 */
export const getSocket = () => socket;
