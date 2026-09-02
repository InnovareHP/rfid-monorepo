import { ROLES } from "@dashboard/shared";
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Session,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { AuthGuard, Roles, UserSession } from "@thallesp/nestjs-better-auth";
import { ZodValidationPipe } from "nestjs-zod";
import { CrossTenant } from "../../filter/tenant-context";
import { DemoService } from "./demo.service";
import {
  ListDemoRequestsQueryDto,
  SetDemoHostDto,
  UpdateDemoRequestDto,
} from "./dto/demo.schema";

// Demo rows belong to the product, not a tenant, so this is super-admin only
// and deliberately outside the organization scope.
@Controller("demo/admin")
@CrossTenant()
@UseGuards(AuthGuard)
@Roles([ROLES.SUPER_ADMIN])
@UsePipes(ZodValidationPipe)
export class DemoController {
  constructor(private readonly demoService: DemoService) {}

  @Get("requests")
  listRequests(@Query() query: ListDemoRequestsQueryDto) {
    return this.demoService.listRequests(query);
  }

  @Patch("requests/:id")
  updateRequest(
    @Param("id") id: string,
    @Body() dto: UpdateDemoRequestDto,
    @Session() session: UserSession
  ) {
    return this.demoService.updateRequest(id, dto, {
      id: session.user.id,
      name: session.user.name,
    });
  }

  @Get("hosts")
  listHosts() {
    return this.demoService.listHosts();
  }

  @Post("hosts")
  setHost(@Body() dto: SetDemoHostDto, @Session() session: UserSession) {
    return this.demoService.setHost(dto.userId, dto.demoEnabled, {
      id: session.user.id,
      name: session.user.name,
    });
  }
}
