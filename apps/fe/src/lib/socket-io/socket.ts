import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

let socket: Socket | null = null;
let tokenGenerator: (() => Promise<string | null>) | null = null;
let reportedOffline = false;

const AUTH_FAILURES = ["No token provided", "Invalid token", "Unauthorized"];

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

  // Auth is answered the same way on every attempt, so a rejected token means
  // retrying only mints another one-time token per backoff tick.
  socket.on("connect_error", (err) => {
    if (AUTH_FAILURES.includes(err.message)) {
      socket?.io.reconnection(false);
      socket?.disconnect();
      toast.error("Live updates stopped. Refresh the page to reconnect.");
      return;
    }

    if (reportedOffline) return;
    reportedOffline = true;
    toast.error("Live updates are offline. Reconnecting.");
  });

  socket.on("connect", () => {
    reportedOffline = false;
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
