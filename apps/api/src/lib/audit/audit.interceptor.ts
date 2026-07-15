import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import type { Request, Response } from "express";
import { Observable, tap } from "rxjs";
import { auth } from "../auth/auth";
import { AuditService } from "./audit.service";

const SKIP_PATHS = [
  /^\/api\/health/,
  /^\/api\/docs/,
  /^\/api\/auth\/(get-session|session)/,
];

function methodToAction(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return "read";
    case "POST":
      return "create";
    case "PUT":
    case "PATCH":
      return "update";
    case "DELETE":
      return "delete";
    default:
      return method.toLowerCase();
  }
}

function deriveResource(path: string): {
  type: string | null;
  id: string | null;
} {
  const trimmed = path.replace(/\?.*$/, "").replace(/^\/api\/?/, "");
  if (!trimmed) return { type: null, id: null };
  const parts = trimmed.split("/");
  const type = parts[0] ?? null;
  const id =
    parts.length > 1 && /^[0-9a-f-]{8,}$/i.test(parts[1] ?? "")
      ? parts[1]
      : null;
  return { type, id };
}

function clientIp(req: Request): string | null {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  if (Array.isArray(xf) && xf.length) return xf[0] ?? null;
  return req.socket?.remoteAddress ?? null;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const http = ctx.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const start = Date.now();

    if (SKIP_PATHS.some((re) => re.test(req.originalUrl || req.url || ""))) {
      return next.handle();
    }

    const requestId = (req.headers["x-request-id"] as string) || randomUUID();
    res.setHeader("x-request-id", requestId);

    return next.handle().pipe(
      tap({
        next: () => void this.commit(req, res, start, requestId),
        error: () => void this.commit(req, res, start, requestId),
      })
    );
  }

  private async commit(
    req: Request,
    res: Response,
    start: number,
    requestId: string
  ): Promise<void> {
    let session: any = null;
    try {
      session = await auth.api.getSession({ headers: req.headers as any });
    } catch {
      session = null;
    }
    const path = (req.originalUrl || req.url || "").replace(/\?.*$/, "");
    const { type, id } = deriveResource(path);
    const action = `${type ?? "http"}.${methodToAction(req.method)}`;

    await this.audit.record({
      actorUserId: session?.user?.id ?? null,
      actorOrgId: session?.session?.activeOrganizationId ?? null,
      actorRole: session?.session?.memberRole ?? null,
      actorIp: clientIp(req),
      actorUserAgent: (req.headers["user-agent"] as string) ?? null,
      action,
      resourceType: type,
      resourceId: id,
      method: req.method,
      path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      requestId,
    });
  }
}
