import { z } from "zod";

export const keyUpdateRequestSchema = z.object({
    keyId: z.string(),
    name: z.string().optional(),
    enabled: z.boolean().optional(),
    remaining: z.number().int().optional(),
    refillAmount: z.number().int().optional(),
    refillInterval: z.number().int().optional(),
    metadata: z.string().optional(),
    expiresIn: z.number().optional(),
    rateLimitEnabled: z.boolean().optional(),
    rateLimitTimeWindow: z.number().int().optional(),
    rateLimitMax: z.number().int().optional(),
  }
).strict()