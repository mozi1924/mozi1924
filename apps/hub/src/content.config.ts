import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    name: z.string(),
    slug: z.string().optional(),
    pinned: z.boolean().default(false),
    pinnedOrder: z.number().default(-1),
    description: z.string().optional().default(''),
    repoUrl: z.string(),
    homepage: z.string().optional().nullable().default(''),
    stars: z.number().default(0),
    forks: z.number().default(0),
    language: z.string().optional().default('Other'),
    topics: z.array(z.string()).default([]),
    license: z.string().optional().nullable().default(''),
    createdAt: z.string(),
    pushedAt: z.string(),
    defaultBranch: z.string().default('main'),
    archived: z.boolean().default(false),
  }),
});

export const collections = { projects };
