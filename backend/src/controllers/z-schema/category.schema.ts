import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (must be hex color)')
    .optional(),
  icon: z.union([
    z.string().regex(/^(lucide|heroicons|tabler):[a-z0-9-]+$/i), // ชื่อไอคอนจาก lib
    z.string().regex(/^.+$/), // emoji:🍔
    z.string().regex(/^https?:\/\/.+$/i), // url:https://...
  ]),
  type: z.enum(['INCOME', 'EXPENSE']),
});

export const updateCategorySchema = createCategorySchema.partial();

export const getCategoriesSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  search: z.string().optional(),
});

export type CreateCategoryParams = z.infer<typeof createCategorySchema>;
export type UpdateCategoryParams = z.infer<typeof updateCategorySchema>;
export type GetCategoriesParams = z.infer<typeof getCategoriesSchema>;
