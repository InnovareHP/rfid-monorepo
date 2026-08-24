import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { ZodValidationPipe } from "nestjs-zod";
import { SubscriptionGuard } from "../../guard/subscription/subscription.guard";
import { ListMembersDto } from "./dto/team.dto";
import { TeamService } from "./team.service";

// Seeing your own teammates is a plain member capability, so this is not
// admin-gated; the team page's management actions are gated separately.
@Controller("team")
@UseGuards(AuthGuard, SubscriptionGuard)
@UsePipes(ZodValidationPipe)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get("members")
  async listMembers(
    @Query() query: ListMembersDto,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      return await this.teamService.listMembers(
        session.session.activeOrganizationId,
        query
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
