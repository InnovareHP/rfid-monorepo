import {
  BadRequestException,
  Controller,
  Get,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import {
  PermissionGuard,
  RequirePermission,
} from "../../guard/permission/permission.guard";
import { EmailIngestService } from "./email-ingest.service";

@Controller("email")
@UseGuards(AuthGuard, PermissionGuard)
export class EmailController {
  constructor(private readonly ingestService: EmailIngestService) {}

  @RequirePermission({ outreach: ["read"] })
  @Get("/ingest-address")
  async getIngestAddress(@Session() session: AuthenticatedSession) {
    try {
      const address = await this.ingestService.getIngestAddress(
        session.session.activeOrganizationId
      );
      return { address };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
