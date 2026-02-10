import { createZodDto } from "nestjs-zod";
import { OnboardingSchema } from "./user.dto";

export class OnboardingDto extends createZodDto(OnboardingSchema) {}
