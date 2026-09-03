import {
  HttpException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";

const logger = new Logger("SafeError");

export const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

// Deliberate HttpExceptions carry vetted copy; anything else (Prisma, driver,
// crypto) is logged server side and answered with one generic message.
export const toSafeError = (error: unknown, context: string): HttpException => {
  if (error instanceof HttpException) return error;

  logger.error(
    `${context}: ${error instanceof Error ? error.message : String(error)}`,
    error instanceof Error ? error.stack : undefined
  );

  return new InternalServerErrorException(GENERIC_ERROR_MESSAGE);
};
