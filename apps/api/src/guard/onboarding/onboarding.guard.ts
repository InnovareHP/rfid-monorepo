import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

@Injectable()
export class OnboardingGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user.user_is_onboarded) {
      throw new UnauthorizedException("User is already onboarded");
    }
    return true;
  }
}
