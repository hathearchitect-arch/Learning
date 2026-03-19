import { z } from "zod"

export const addUserRequestSchema = z.object({
  userId: z.string().optional(),
  userEmail: z.string().optional()
}).superRefine((data, ctx) => {
  if (!data.userId && !data.userEmail) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Must provide either id or email of user",
      path: ['userId', 'userEmail']
    })
  }
})