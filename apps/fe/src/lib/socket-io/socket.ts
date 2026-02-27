import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket) return socket;

  socket = io(import.meta.env.VITE_API_URL, {
    withCredentials: true,
    transports: ["polling", "websocket"],
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

export const getSocket = () => socket;
