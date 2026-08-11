import { ROLES } from "@dashboard/shared";
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { HipaaGuard } from "./hipaa.guard";

const PLATFORM_ROLES = new Set<string>([ROLES.SUPPORT, ROLES.SUPER_ADMIN]);

// Agents and tenants share every PHI-bearing support route, so the gate has to
// split on role rather than on the route.
//
// A tenant's ipAllowlist describes that tenant's own workforce. A support agent
// belongs to the business associate instead and will never sit on the tenant's
// network, so holding them to that allowlist would deny every agent rather than
// protect anything. HipaaGuard already skips a session with no organization for
// this reason; the skip is by role here because an agent who also holds a Member
// row would otherwise pick up an activeOrganizationId and be judged as a tenant.
//
// Tenant users still answer to their organization's posture: a ticket is where
// record detail gets pasted, which is why the text is encrypted at rest.
@Injectable()
export class SupportHipaaGuard extends HipaaGuard {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    if (!request.session) throw new UnauthorizedException("No session found");
    if (PLATFORM_ROLES.has(request.session.user?.role)) return true;

    return super.canActivate(context);
  }
}
