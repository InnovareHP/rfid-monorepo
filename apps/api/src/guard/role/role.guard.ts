import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

@Injectable()
export class AdminRoleGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const data = request.session;

    if (!data) {
      throw new UnauthorizedException("No session found");
    }

    const memberRole = data.session.memberRole;
    if (memberRole !== "owner") {
      throw new ForbiddenException(
        "You are not authorized to access this resource"
      );
    }

    return true;
  }
}
