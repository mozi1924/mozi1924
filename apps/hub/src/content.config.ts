import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    name: z.string(),
    slug: z.string().optional(),
    owner: z.string().optional().default('mozi1924'),
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
    image: z.string().optional().default(''),
    createdAt: z.string(),
    pushedAt: z.string(),
    defaultBranch: z.string().default('main'),
    archived: z.boolean().default(false),
  }),
});

export const collections = { projects };
