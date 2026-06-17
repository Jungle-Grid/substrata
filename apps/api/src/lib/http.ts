import type { ZodSchema } from 'zod';
import type { Request } from 'express';

export function parseBody<T>(schema: ZodSchema<T>, req: Request): T {
  return schema.parse(req.body);
}

