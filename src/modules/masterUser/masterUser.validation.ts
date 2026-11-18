import { z } from 'zod';

export const masterUserLoginSchema = z.object({
  body: z.object({
    masterEmail: z.string().trim().email('Valid master email is required'),
    email: z.string().trim().email('Valid user email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});
