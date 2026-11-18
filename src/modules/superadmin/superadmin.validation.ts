import { z } from 'zod';

export const superAdminLoginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const createMasterSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Master name must be at least 2 characters'),
    email: z.string().trim().email('Valid email is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const listMastersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    search: z.string().optional(),
  }),
});
