import {
  Controller,
  Get,
  Post,
  Query,
  Session,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import {
  PermissionGuard,
  RequirePermission,
} from "../../guard/permission/permission.guard";
import { BillingService } from "./billing.service";

// Org id always comes from the session, never the body, so there is no
// cross-org path. Reads are open to any member; writes are owner-only.
@Controller("billing")
@UseGuards(AuthGuard, PermissionGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @RequirePermission({ billing: ["manage_billing"] })
  @Get("plans")
  listPlans() {
    return this.billingService.listPlans();
  }

  @RequirePermission({ billing: ["manage_billing"] })
  @Get("plan")
  getPlanCard(@Session() session: MemberSession) {
    return this.billingService.getPlanCard(
      session.session.activeOrganizationId
    );
  }

  @RequirePermission({ billing: ["manage_billing"] })
  @Get("invoices")
  listInvoices(
    @Session() session: MemberSession,
    @Query("startingAfter") startingAfter?: string
  ) {
    return this.billingService.listInvoices(
      session.session.activeOrganizationId,
      startingAfter
    );
  }

  @Post("cancel")
  @RequirePermission({ billing: ["manage_billing"] })
  cancel(@Session() session: MemberSession) {
    return this.billingService.cancel(session.session.activeOrganizationId);
  }

  @Post("resume")
  @RequirePermission({ billing: ["manage_billing"] })
  resume(@Session() session: MemberSession) {
    return this.billingService.resume(session.session.activeOrganizationId);
  }
}
