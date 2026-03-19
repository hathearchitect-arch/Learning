import { generateUUID } from '@/lib/utils';
import { z } from 'zod';

const textPartSchema = z.object({
  text: z.string().min(1).max(2000),
  type: z.enum(['text']),
});

export const postRequestBodySchema = z
  .object({
    id: z.string().uuid().optional(),
    agentId: z.string().uuid().optional(),
    message: z
      .object({
        id: z
          .string()
          .uuid()
          .optional()
          .default(() => generateUUID()),
        createdAt: z.coerce
          .date()
          .optional()
          .default(() => new Date()),
        role: z.enum(['user']).optional().default('user'),
        content: z.string().min(1).max(2000),
        parts: z.array(textPartSchema).optional(),
        experimental_attachments: z
          .array(
            z.object({
              url: z.string().url(),
              name: z.string().min(1).max(2000),
              contentType: z.enum(['image/png', 'image/jpg', 'image/jpeg']),
            }),
          )
          .optional(),
      })
      .transform((data) => ({
        ...data,
        parts: data.parts || [{ type: 'text', text: data.content }], //if not provided, auto-generate parts from content
      })),
    impersonatedUser: z
      .object({
        id: z.string().optional(),
        email: z.string().email().optional(),
      })
      .optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    selectedChatModel: z
      .enum(['chat-model', 'chat-model-reasoning'])
      .optional()
      .default('chat-model'),
    selectedVisibilityType: z
      .enum(['public', 'private'])
      .optional()
      .default('private'),
  })
  .superRefine((data, ctx) => {
    if (!data.id && !data.agentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Must provide either agentId if creating a new chat, or chat id if resuming an existing chat',
        path: ['agentId', 'id'],
      });
    }
  });

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
