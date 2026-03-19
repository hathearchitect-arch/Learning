import { z } from 'zod';

export const addUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  isActive: z.boolean().optional().default(true),
});

export type AddUserData = z.infer<typeof addUserSchema>;

export const removeUserSchema = z
  .object({
    userId: z.string().optional(),
    email: z.string().email().optional(),
  })
  .refine((data) => data.userId || data.email, {
    message: 'Either userId or email must be provided',
  });

export type RemoveUserData = z.infer<typeof removeUserSchema>;
