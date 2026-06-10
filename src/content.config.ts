import { defineCollection, z } from 'astro:content';

const post = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    dateFormatted: z.string(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    readTime: z.string().optional(),
    difficulty: z.enum(['Básico', 'Intermedio', 'Avanzado']).optional(),
  }),
});

export const collections = {
  post,
};
