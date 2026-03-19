import { z } from 'zod';

export const patchAgentSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  modelId: z.string().optional(),
  isActive: z.boolean().optional(),
  instructions: z.string().optional(),
  temperature: z.number().optional(),
  greeting: z
    .array(z.string().min(1).max(50))
    .length(2, 'Greeting must contain exactly 2 messages')
    .optional(),
  isToolKnowledgebaseEnabled: z.boolean().optional(),
  isCustomMetadataFilteringEnabled: z.boolean().optional(),
  toolKnowledgebaseSettings: z
    .object({
      maxResults: z.number().optional(),
      minSimilarityScore: z.number().optional(),
    })
    .optional(),
  isToolCreateDocumentEnabled: z.boolean().optional(),
  isToolUpdateDocumentEnabled: z.boolean().optional(),
  isToolCodeGenerationEnabled: z.boolean().optional(),
  isToolImageGenerationEnabled: z.boolean().optional(),
  isToolQueryDatabaseEnabled: z.boolean().optional(),
  theme: z.enum(['light', 'dark']).optional(),
  themeAttributes: z.record(z.string()).optional(),
  logoS3Key: z.string().nullable().optional(),
  avatar: z.string().optional(),
  font: z.string().optional(),
});
