import { z } from "zod";


export const keyDisableRequestSchema = z.object({
  keyId: z.string()
})