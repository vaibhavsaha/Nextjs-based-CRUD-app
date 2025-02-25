import { z } from 'zod';

export const postSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  body: z.string().min(1, 'Content is required').max(500, 'Content must be less than 500 characters'),
  user_id: z.string(),
  is_anonymous: z.boolean().optional().default(false),
  created_at: z.string().datetime().optional()
});

export type Post = z.infer<typeof postSchema>;

export type User = {
  id: string;
  email?: string;
  isAnonymous?: boolean;
  [key: string]: any;
};