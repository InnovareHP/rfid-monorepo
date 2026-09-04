import { createZodDto } from "nestjs-zod";
import {
  AdminEntitlementSchema,
  AdminSignInLinkSchema,
  CreateAdminUserSchema,
  OnboardingSchema,
} from "./user.dto";

export class OnboardingDto extends createZodDto(OnboardingSchema) {}

export class AdminEntitlementDto extends createZodDto(AdminEntitlementSchema) {}

export class CreateAdminUserDto extends createZodDto(CreateAdminUserSchema) {}

export class AdminSignInLinkDto extends createZodDto(AdminSignInLinkSchema) {}
