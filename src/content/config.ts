import { defineCollection, z } from 'astro:content';

const baseSchema = z.object({
    title: z.string(),
    desc: z.string().optional(),
    date: z.string(), // YYYY-MM-DD
    modDate: z.string().optional(),
    image: z.string().optional(),
    authorId: z.string().optional(),
    pageType: z.enum(["article", "blog", "website", "profile"]).optional(),
});

const articleCollection = defineCollection({
    type: 'content',
    schema: baseSchema.extend({
        seriesIndex: z.number().optional(), // For ordering in series
        hideComment: z.boolean().optional().default(false),
    }),
});

const blogCollection = defineCollection({
    type: 'content',
    schema: baseSchema.extend({
        categories: z.array(z.string()).optional(),
        disable_comments: z.boolean().optional(),
    }),
});

export const collections = {
    'article': articleCollection,
    'blog': blogCollection,
};
