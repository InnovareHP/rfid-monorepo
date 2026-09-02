import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let tokenGenerator: (() => Promise<string | null>) | null = null;

export function setTokenGenerator(fn: () => Promise<string | null>) {
  tokenGenerator = fn;
}

export function connectSocket(): Socket {
  if (socket) return socket;

  socket = io(import.meta.env.VITE_API_URL, {
    // Must match the gateway's path exactly; socket.io appends its own
    // handshake query, not a /socket.io segment.
    path: "/ws",
    transports: ["websocket"],
    // The token is single-use, so it is minted per attempt rather than once
    // per socket: a reconnect replaying a spent token is rejected as
    // Unauthorized.
    auth: (cb) => {
      const generate = tokenGenerator?.() ?? Promise.resolve(null);
      generate
        .then((token) => cb({ token: token ?? "" }))
        .catch(() => cb({ token: "" }));
    },
    reconnection: true,
    // A capped count meant one backend blip ended realtime for the rest of the
    // page session with nothing in the UI to say so. The delay backs off, so
    // retrying indefinitely costs one attempt every 30s at worst.
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
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
