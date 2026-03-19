import { z } from 'zod';

export const createAgentSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().min(10).max(500),
  modelId: z.string(),
  temperature: z.number().min(0).max(1).optional().default(0.5),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  monthlyQueryLimit: z.number().optional(),
  isToolKnowlegebaseEnabled: z.boolean().optional().default(true),
  toolKnowledgebaseSettings: z.object({
    maxResults: z.number().int(),
    minSimilarityScore: z.number()
  }).default({
    maxResults: 10,
    minSimilarityScore: 0.2
  }),
  //isToolCodeGenerationEnabled: z.boolean().optional().default(false), //not currently supported
  //isToolImageGenerationEnabled: z.boolean().optional().default(false),
  isToolQueryDatabaseEnabled: z.boolean().optional().default(false),
  isToolCreateDocumentEnabled: z.boolean().optional().default(false),
  isToolUpdateDocumentEnabled: z.boolean().optional().default(false),
  isCustomMetadataFilteringEnabled: z.boolean().optional().default(false),
});
