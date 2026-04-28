import { logger } from "@/lib/logger.js";
import { AppError } from "@/utils/errors.js";
import { fail } from "@/utils/response.js";
import type { ErrorHandler } from "hono";
import { ZodError } from "zod";

export const errorHandler: ErrorHandler = (err, c) => {
  // `as string | undefined` : ErrorHandler context does not carry the AppVariables generic;
  // requestId is set by requestIdMiddleware on every request and is always a string when present
  const requestId = c.get("requestId") as string | undefined;

  if (err instanceof ZodError) {
    return c.json(fail("VALIDATION_ERROR", "Invalid input", err.issues), 400);
  }
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ requestId, err }, "application error");
    } else {
      logger.warn({ requestId, code: err.code, status: err.statusCode }, "client error");
    }
    // `as never` : AppError.statusCode est `number`, Hono attend un littéral StatusCode strict
    return c.json(fail(err.code, err.message, err.details), err.statusCode as never);
  }
  logger.error({ requestId, err }, "unhandled error");
  return c.json(fail("INTERNAL_ERROR", "An unexpected error occurred"), 500);
};
