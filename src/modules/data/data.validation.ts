import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createDataSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Title is required'),
    description: z.string().trim().min(1, 'Description is required'),
  }),
});

export const updateDataSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid ObjectId format'),
  }),
  body: z.object({
    title: z.string().trim().min(1, 'Title cannot be empty').optional(),
    description: z.string().trim().min(1, 'Description cannot be empty').optional(),
  }).refine((data) => data.title !== undefined || data.description !== undefined, {
    message: 'At least one field (title or description) must be provided for update',
  }),
});

export const dataIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(objectIdRegex, 'Invalid ObjectId format'),
  }),
});

export const listDataQuerySchema = z.object({
  query: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('10'),
    search: z.string().optional(),
  }),
});
