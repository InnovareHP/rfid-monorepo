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

    const subscription = await prisma.subscription.findFirstOrThrow({
      where: {
        referenceId: organizationId,
      },
      select: {
        status: true,
        trialStart: true,
        trialEnd: true,
      },
      take: 1,
    });

    // Pick the org’s active subscription
    const activeSubscription =
      subscription.status === "active" ||
      subscription.status === "trialing";

    if (!activeSubscription) {
      throw new ForbiddenException("Subscription inactive or expired.");
    }

    const isTrial =
      subscription.trialStart &&
      subscription.trialEnd &&
      new Date(subscription.trialEnd) > new Date();

    request.subscription = {
      isTrial,
      activeSubscription: subscription,
    };

    return true;
  }
}
