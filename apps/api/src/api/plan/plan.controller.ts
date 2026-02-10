import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { GetPlanDto } from "./dto/plan.schema";
import { PlanService } from "./plan.service";

@Controller("plan")
@UseGuards(AuthGuard)
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get("/list")
  async findAll(@Query() dto: GetPlanDto) {
    try {
      return this.planService.GetAllPlan(dto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
