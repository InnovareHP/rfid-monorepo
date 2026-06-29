import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger("Exception");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isProd = process.env.NODE_ENV === "production";

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    const requestId =
      (response.getHeader("x-request-id") as string) ||
      (request.headers["x-request-id"] as string) ||
      randomUUID();
    response.setHeader("x-request-id", requestId);

    this.logger.error(
      `${request.method} ${(request.originalUrl || request.url || "").split("?")[0]} -> ${status} id=${requestId}`,
      exception instanceof Error ? exception.stack : String(exception)
    );

    const safeMessage =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Internal server error";

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      requestId,
      message: isProd && status >= 500 ? "Internal server error" : safeMessage,
    });
  }
}
