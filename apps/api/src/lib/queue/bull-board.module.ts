import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { BullBoardModule } from "@bull-board/nestjs";
import { Module } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { auth } from "../auth/auth";
import { QUEUE_NAMES } from "./queue.constants";

const ALLOWED_ROLES = new Set(["super_admin", "support"]);

async function bullBoardAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await auth.api.getSession({ headers: req.headers as any });
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (session && role && ALLOWED_ROLES.has(role)) {
      return next();
    }
  } catch {
    // fall through to 404
  }
  res.status(404).end();
}

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: "/api/queues",
      adapter: ExpressAdapter,
      middleware: bullBoardAuth,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.EMAIL,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.BULK_EMAIL,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.CSV_IMPORT,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.GEMINI,
      adapter: BullMQAdapter,
    }),
  ],
})
export class BullBoardSetupModule {}
