import { z } from 'zod';
import { insertSubscriptionSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  subscription: {
    get: {
      method: 'GET' as const,
      path: '/api/subscription' as const,
      responses: {
        200: z.object({
          isPro: z.boolean(),
          subscription: z.custom<any>().nullable(), // relaxed type for now
        }),
        401: errorSchemas.notFound, // unauthorized treated as not found/no sub
      },
    },
    create: { // Mock upgrade
      method: 'POST' as const,
      path: '/api/subscription' as const,
      input: z.object({}),
      responses: {
        201: z.object({ success: z.boolean() }),
        400: errorSchemas.validation,
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
