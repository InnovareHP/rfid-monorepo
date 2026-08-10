import { createZodDto } from "nestjs-zod";
import { AdminEntitlementSchema, OnboardingSchema } from "./user.dto";

export class OnboardingDto extends createZodDto(OnboardingSchema) {}

export class AdminEntitlementDto extends createZodDto(AdminEntitlementSchema) {}
