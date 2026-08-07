import { ROLES, isOrgAdmin } from "@dashboard/shared";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const data = request.session;

    if (!data) {
      throw new UnauthorizedException("No session found");
    }

    const memberRole = data.session.memberRole;
    if (!isOrgAdmin(memberRole)) {
      throw new ForbiddenException(
        "You are not authorized to access this resource"
      );
    }

    return true;
  }
}

// Billing and organization deletion stay owner-only, admins are excluded.
@Injectable()
export class OwnerRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const data = request.session;

    if (!data) {
      throw new UnauthorizedException("No session found");
    }

    if (data.session.memberRole !== ROLES.OWNER) {
      throw new ForbiddenException(
        "Only the organization owner can access this resource"
      );
    }

    return true;
  }
}
