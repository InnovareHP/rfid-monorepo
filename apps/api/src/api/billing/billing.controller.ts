import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Session,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { ZodValidationPipe } from "nestjs-zod";
import {
  PermissionGuard,
  RequirePermission,
} from "../../guard/permission/permission.guard";
import { BillingHistoryService } from "./billing-history.service";
import { BillingService } from "./billing.service";
import {
  ListInvoicesQueryDto,
  ListTransactionsQueryDto,
  UpdateSeatsDto,
} from "./dto/billing.schema";

// Org id always comes from the session, never the body, so there is no
// cross-org path. Reads are open to any member; writes are owner-only.
@Controller("billing")
@UseGuards(AuthGuard, PermissionGuard)
@UsePipes(ZodValidationPipe)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly billingHistoryService: BillingHistoryService
  ) {}

  @RequirePermission({ billing: ["manage_billing"] })
  @Get("plans")
  listPlans() {
    return this.billingService.listPlans();
  }

  @Get("contract")
  getContractCard(@Session() session: MemberSession) {
    return this.billingService.getContractCard(
      session.session.activeOrganizationId
    );
  }

  @RequirePermission({ billing: ["manage_billing"] })
  @Get("plan")
  getPlanCard(@Session() session: MemberSession) {
    return this.billingService.getPlanCard(
      session.session.activeOrganizationId
    );
  }

  // Stripe pages invoices by cursor, our ledger by offset, so the two history
  // routes take different paging params on purpose.
  @RequirePermission({ billing: ["manage_billing"] })
  @Get("invoices")
  listInvoices(
    @Session() session: MemberSession,
    @Query() query: ListInvoicesQueryDto
  ) {
    return this.billingHistoryService.listInvoices(
      session.session.activeOrganizationId,
      query.startingAfter
    );
  }

  @RequirePermission({ billing: ["manage_billing"] })
  @Get("transactions")
  listTransactions(
    @Session() session: MemberSession,
    @Query() query: ListTransactionsQueryDto
  ) {
    return this.billingHistoryService.listTransactions(
      session.session.activeOrganizationId,
      query
    );
  }

  @Post("seats")
  @RequirePermission({ billing: ["manage_billing"] })
  updateSeats(@Session() session: MemberSession, @Body() body: UpdateSeatsDto) {
    return this.billingService.updateSeats(
      session.session.activeOrganizationId,
      body.seats
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
