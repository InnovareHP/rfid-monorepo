import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(this: void, exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Internal server error";

    console.error("Unhandled Exception:", exception);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
