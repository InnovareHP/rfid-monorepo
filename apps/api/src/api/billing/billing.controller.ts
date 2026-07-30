import {
  Controller,
  Get,
  Post,
  Query,
  Session,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { AdminRoleGuard } from "../../guard/role/role.guard";
import { BillingService } from "./billing.service";

// Org id always comes from the session, never the body, so there is no
// cross-org path. Reads are open to any member; writes are owner-only.
@Controller("billing")
@UseGuards(AuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("plans")
  listPlans() {
    return this.billingService.listPlans();
  }

  @Get("plan")
  getPlanCard(@Session() session: MemberSession) {
    return this.billingService.getPlanCard(
      session.session.activeOrganizationId
    );
  }

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
  @UseGuards(AdminRoleGuard)
  cancel(@Session() session: MemberSession) {
    return this.billingService.cancel(session.session.activeOrganizationId);
  }

  @Post("resume")
  @UseGuards(AdminRoleGuard)
  resume(@Session() session: MemberSession) {
    return this.billingService.resume(session.session.activeOrganizationId);
  }
}
