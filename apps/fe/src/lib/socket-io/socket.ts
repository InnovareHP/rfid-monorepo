import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let tokenGenerator: (() => Promise<string | null>) | null = null;
let isReconnecting = false;

export function setTokenGenerator(fn: () => Promise<string | null>) {
  tokenGenerator = fn;
}

function createSocket(token: string): Socket {
  return io(import.meta.env.VITE_API_URL, {
    path: "/ws/socket.io",
    transports: ["websocket"],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });
}

export async function connectSocket(sessionToken: string): Promise<Socket> {
  if (socket?.connected) return socket;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = createSocket(sessionToken);

  socket.on("connect_error", async (err) => {
    console.error("Socket error:", err.message);

    if (!tokenGenerator || isReconnecting) return;
    isReconnecting = true;

    try {
      const newToken = await tokenGenerator();
      if (!newToken) return;

      socket?.disconnect();
      socket = null;
      socket = createSocket(newToken);
    } finally {
      isReconnecting = false;
    }
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
