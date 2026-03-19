import { z } from 'zod';

export const getUploadUrlSchema = z.object({
  folderId: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
});
