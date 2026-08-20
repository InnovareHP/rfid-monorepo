import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";

// Unauthenticated on purpose: the ALB target group probes this and returns
// nothing about the tenant or the process beyond liveness.
@Controller("health")
export class HealthController {
  @Get()
  @SkipThrottle()
  check() {
    return { status: "ok" };
  }
}
