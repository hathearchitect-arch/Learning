import { z } from "zod";

export const createApiKeySchema = z.object({
  name: z.string(),
  expiresIn: z.number().optional(),
  metadata: z.string().optional()
})
.strict();