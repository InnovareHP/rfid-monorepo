import { io, Socket } from "socket.io-client";

// Define your events for better Type Safety later
// interface ServerToClientEvents {}
// interface ClientToServerEvents {}

let socket: Socket | null = null;

export function connectSocket(): Socket {
  // If socket exists and is trying to connect or is already connected, reuse it
  if (socket) {
    return socket;
  }

  socket = io(import.meta.env.VITE_API_URL, {
    withCredentials: true,
    transports: ["websocket"], // Prioritize websocket for performance
    autoConnect: true,
    reconnectionAttempts: 5,
  });

  // Basic Error Handling
  socket.on("connect_error", (err) => {
    console.error(`Socket connection error: ${err.message}`);
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
