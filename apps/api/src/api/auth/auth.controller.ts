import { Controller, Post, Session, UseGuards } from "@nestjs/common";
import { AuthGuard, UserSession } from "@thallesp/nestjs-better-auth";

@Controller("auth")
@UseGuards(AuthGuard)
export class AuthController {
  @Post("get-session")
  getSession(@Session() session: UserSession) {
    return { user: session.user };
  }
}
