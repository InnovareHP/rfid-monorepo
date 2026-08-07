import { Request } from "express";

// Kept apart from the audit interceptor so a guard can read the client address
// without importing the auth module that interceptor pulls in.
export function clientIp(req: Request): string | null {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  if (Array.isArray(xf) && xf.length) return xf[0] ?? null;
  return req.socket?.remoteAddress ?? null;
}
