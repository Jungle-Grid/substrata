import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/errors';

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof HttpError) {
    console.error('HTTP error response', {
      method: req.method,
      path: req.originalUrl,
      statusCode: error.statusCode,
      message: error.message,
      details: error.details ?? null,
    });

    return res.status(error.statusCode).json({
      error: 'HttpError',
      message: error.message,
      details: error.details ?? null,
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'ValidationError',
      details: error.flatten(),
    });
  }

  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred.';

  console.error('Unhandled error response', {
    method: req.method,
    path: req.originalUrl,
    message,
    error,
  });

  return res.status(500).json({
    error: 'InternalServerError',
    message,
  });
}
