import { z } from 'zod';

export const uploadSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
});