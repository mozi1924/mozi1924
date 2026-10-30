import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articleCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/article' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      desc: z.string().optional(),
      date: z.string(), // YYYY-MM-DD
      modDate: z.string().optional(),
      image: image().optional(),
      authorId: z.string().optional(),
      lang: z.string().optional(),
      pageType: z.enum(['article', 'blog', 'website', 'profile']).optional(),
      draft: z.boolean().optional().default(false),
      translations: z
        .array(
          z.object({
            lang: z.string(),
            slug: z.string(),
          })
        )
        .optional(),
      seriesIndex: z.number().optional(), // For ordering in series
      hideComment: z.boolean().optional().default(false),
      keywords: z.string().optional(),
    }),
});

const blogCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      desc: z.string().optional(),
      date: z.string(), // YYYY-MM-DD
      modDate: z.string().optional(),
      image: image().optional(),
      authorId: z.string().optional(),
      lang: z.string().optional(),
      pageType: z.enum(['article', 'blog', 'website', 'profile']).optional(),
      draft: z.boolean().optional().default(false),
      translations: z
        .array(
          z.object({
            lang: z.string(),
            slug: z.string(),
          })
        )
        .optional(),
      categories: z.array(z.string()).optional(),
      disable_comments: z.boolean().optional(),
    }),
});

export const collections = {
  article: articleCollection,
  blog: blogCollection,
};
