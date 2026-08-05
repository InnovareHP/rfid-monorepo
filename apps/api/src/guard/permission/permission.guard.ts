import { DomainPermission } from "@dashboard/shared";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { orgRoles } from "../../lib/auth/permission";

const PERMISSION_KEY = "required_permission";

export const RequirePermission = (permission: DomainPermission) =>
  SetMetadata(PERMISSION_KEY, permission);

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<DomainPermission>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!required) return true;

    const session = context.switchToHttp().getRequest().session;
    if (!session) {
      throw new UnauthorizedException("No session found");
    }

    // Better Auth authorizes against the role definition, so the grant table
    // stays the single source of truth for both apps.
    const role = orgRoles[session.session.memberRole];
    if (!role || !role.authorize(required).success) {
      throw new ForbiddenException(
        "You are not authorized to access this resource"
      );
    }

    return true;
  }
}
