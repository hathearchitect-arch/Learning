import { z } from "zod";

export const createFolderSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  parentFolderId: z.string().uuid().nullable().optional(),
});
