import { User } from "@dashboard/shared";
import type { UserSession } from "@thallesp/nestjs-better-auth";

declare global {
  /**
   * Base authenticated session — activeOrganizationId is required.
   * Used by most controllers (board, lead, referral, options, analytics).
   */
  type AuthenticatedSession = UserSession & {
    session: { activeOrganizationId: string };
    user: User & { role: string };
  };

  /**
   * Session with member context — adds memberId and memberRole.
   * Used by liason and controllers that need org-member info.
   */
  type MemberSession = UserSession & {
    session: {
      activeOrganizationId: string;
      memberId: string;
      memberRole: string;
    };
  };

  /**
   * Session with member context and userId.
   * Used by controllers that also need the userId on the session.
   */
  type FullSession = UserSession & {
    session: {
      activeOrganizationId: string;
      memberId: string;
      memberRole: string;
      userId: string;
    };
  };

  namespace Express {
    interface Request {
      session: AuthenticatedSession;
    }
  }
}

export {};
