import { z } from "zod";

export const EnrollmentCodeSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
});

export const ResetMemberPasskeysSchema = z.object({
  reason: z.string().trim().min(1).max(280).optional(),
});
