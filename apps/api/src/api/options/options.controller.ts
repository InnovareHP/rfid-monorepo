import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { StripeGuard } from "src/guard/stripe/stripe.guard";
import { OptionsService } from "./options.service";

@Controller("options")
@UseGuards(AuthGuard)
@UseGuards(StripeGuard)
export class OptionsController {
  constructor(private readonly optionsService: OptionsService) {}

  @Get("/counties")
  async getCounties(
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      const organizationId = session.session.activeOrganizationId;
      return await this.optionsService.getCounties(organizationId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/facility")
  async getFieldOptions(
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      const organizationId = session.session.activeOrganizationId;
      const assignedTo = session.session.userId;
      return await this.optionsService.getFieldOptions(
        organizationId,
        assignedTo
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/members")
  async getMemberOptions(
    @Query("isLiaison") isLiason: string,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      const organizationId = session.session.activeOrganizationId;
      const isLiasonValue = isLiason === "true";

      return await this.optionsService.getMemberOptions(
        organizationId,
        isLiasonValue
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
