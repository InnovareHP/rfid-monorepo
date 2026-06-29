import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(this: void, req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const logger = new Logger("HTTP");
    const path = (req.originalUrl || req.url || "").split("?")[0];

    res.on("finish", () => {
      const duration = Date.now() - startTime;
      const reqId = res.getHeader("x-request-id") ?? "-";
      logger.log(
        `${req.method} ${path} ${res.statusCode} ${duration}ms id=${reqId}`
      );
    });

    res.on("error", (error) => {
      logger.error(`req error ${req.method} ${path}: ${error.message}`);
    });

    next();
  }
}
