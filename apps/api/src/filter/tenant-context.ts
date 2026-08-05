import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { NextFunction, Request, Response } from "express";
import {
  runWithTenantStore,
  setTenantOrganization,
  setTenantUnscoped,
} from "../lib/prisma/tenant-context";

const CROSS_TENANT_KEY = "cross_tenant";

// Marks routes that resolve their own row by slug or token before any tenant is
// known, so the Prisma scope guard must stand down for them.
export const CrossTenant = () => SetMetadata(CROSS_TENANT_KEY, true);

// Opens the store before routing so every guard, handler and service below
// shares one object; the session is not resolved yet at this point.
export const tenantContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => runWithTenantStore(() => next());

// Runs after the guards, which is the first point where req.session exists.
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const crossTenant = this.reflector.getAllAndOverride<boolean>(
      CROSS_TENANT_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (crossTenant) {
      setTenantUnscoped();
      return next.handle();
    }

    const session = context.switchToHttp().getRequest().session;
    setTenantOrganization(session?.session?.activeOrganizationId ?? null);
    return next.handle();
  }
}
