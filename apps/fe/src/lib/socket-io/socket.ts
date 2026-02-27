import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let tokenGenerator: (() => Promise<string | null>) | null = null;

export function setTokenGenerator(fn: () => Promise<string | null>) {
  tokenGenerator = fn;
}

export async function connectSocket(sessionToken: string): Promise<Socket> {
  if (socket?.connected) return socket;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(import.meta.env.VITE_API_URL, {
    path: "/ws/socket.io",
    transports: ["websocket"],
    auth: { token: sessionToken },
    reconnection: false,
  });

  socket.on("connect_error", async (err) => {
    console.error("Socket error:", err.message);

    if (!tokenGenerator) return;

    const newToken = await tokenGenerator();
    if (!newToken) return;

    socket?.disconnect();
    socket = null;

    socket = io(import.meta.env.VITE_API_URL, {
      path: "/ws/socket.io",
      transports: ["websocket"],
      auth: { token: newToken },
      reconnection: false,
    });
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
