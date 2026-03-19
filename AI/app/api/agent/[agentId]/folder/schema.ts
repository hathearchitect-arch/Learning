import { z } from 'zod';

export const manageFoldersSchema = z.object({
  folderIds: z.array(z.string().uuid()),
});

export type ManageFoldersData = z.infer<typeof manageFoldersSchema>;
