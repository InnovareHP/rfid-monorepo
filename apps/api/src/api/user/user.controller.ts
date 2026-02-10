import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Session,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, UserSession } from "@thallesp/nestjs-better-auth";
import { OnboardingGuard } from "src/guard/onboarding/onboarding.guard";
import { OnboardingDto } from "./dto/user.schema";
import { UserService } from "./user.service";

@Controller("user")
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("onboarding")
  @UseGuards(OnboardingGuard)
  async onboarding(
    @Body() onboardDto: OnboardingDto,
    @Session() session: UserSession
  ) {
    try {
      const user = await this.userService.onboarding(
        onboardDto,
        session.user.id
      );
      return { user };
    } catch (error) {
      throw new BadRequestException(error);
    }
  }
}
