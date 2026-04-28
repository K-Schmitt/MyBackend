import { z } from "zod";

export const updateUserProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  bio: z.string().trim().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
