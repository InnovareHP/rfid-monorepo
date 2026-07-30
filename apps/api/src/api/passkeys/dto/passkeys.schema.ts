import { createZodDto } from "nestjs-zod";
import {
  EnrollmentCodeSchema,
  ResetMemberPasskeysSchema,
} from "./passkeys.dto";

export class EnrollmentCodeDto extends createZodDto(EnrollmentCodeSchema) {}
export class ResetMemberPasskeysDto extends createZodDto(
  ResetMemberPasskeysSchema
) {}
