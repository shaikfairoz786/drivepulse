import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import { sendError } from '../utils/response';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error(`Unhandled Error on ${req.method} ${req.originalUrl}:`, err);

  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return sendError(res, 'Validation error', 422, formattedErrors);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      return sendError(res, `A record with this ${target} already exists.`, 409);
    }
    if (err.code === 'P2025') {
      return sendError(res, 'Record not found.', 404);
    }
    return sendError(res, `Database error: ${err.message}`, 400);
  }

  if (err.status || err.statusCode) {
    return sendError(res, err.message || 'Error occurred', err.status || err.statusCode, err.errors);
  }

  return sendError(
    res,
    process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred.'
      : err.message || 'Internal Server Error',
    500
  );
}
