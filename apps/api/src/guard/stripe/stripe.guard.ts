import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { prisma } from "src/lib/prisma/prisma";

@Injectable()
export class StripeGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const data = request.session;

    if (!data) {
      throw new UnauthorizedException("No session found");
    }

    const organizationId = data.session.activeOrganizationId;

    if (!organizationId) {
      throw new ForbiddenException("No active organization");
    }

    const subscription = await prisma.subscription_table.findFirstOrThrow({
      where: {
        subscription_reference_id: organizationId,
      },
      select: {
        subscription_status: true,
        subscription_trial_start: true,
        subscription_trial_end: true,
      },
      take: 1,
    });

    // Pick the org’s active subscription
    const activeSubscription =
      subscription.subscription_status === "active" ||
      subscription.subscription_status === "trialing";

    if (!activeSubscription) {
      throw new ForbiddenException("Subscription inactive or expired.");
    }

    const isTrial =
      subscription.subscription_trial_start &&
      subscription.subscription_trial_end &&
      new Date(subscription.subscription_trial_end) > new Date();

    request.subscription = {
      isTrial,
      activeSubscription: subscription,
    };

    return true;
  }
}
