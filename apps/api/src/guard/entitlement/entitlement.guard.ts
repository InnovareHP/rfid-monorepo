import { entitlementHasFeature, PlanFeature } from "@dashboard/shared";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { OrganizationEntitlement } from "../subscription/subscription.guard";

const FEATURE_KEY = "required_feature";

export const RequireFeature = (feature: PlanFeature) =>
  SetMetadata(FEATURE_KEY, feature);

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<PlanFeature>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const entitlement = request.entitlement as
      | OrganizationEntitlement
      | undefined;

    // SubscriptionGuard fills this, so a missing value means the controller is
    // missing that guard rather than that the organization is entitled.
    if (!entitlement) {
      throw new ForbiddenException("Subscription could not be verified");
    }

    // Reads the resolved features, never the plan name, so a contract is gated
    // on what it actually bought.
    if (!entitlementHasFeature(entitlement, required)) {
      throw new ForbiddenException(
        `Your plan does not include this feature. Upgrade to use it.`
      );
    }

    return true;
  }
}
