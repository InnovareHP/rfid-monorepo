import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "@thallesp/nestjs-better-auth";

// Unauthenticated on purpose: the ALB target group probes this and returns
// nothing about the tenant or the process beyond liveness.
@Controller("health")
export class HealthController {
  @Get()
  @Public()
  @SkipThrottle()
  check() {
    return { status: "ok" };
  }
}
