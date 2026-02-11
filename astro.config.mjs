import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';

import mdx from '@astrojs/mdx';

// Helper to generate redirects from blog posts
const generateBlogRedirects = () => {
  const redirects = {};
  const blogDir = './src/pages/blogs';

  if (!fs.existsSync(blogDir)) return redirects;

  const files = fs.readdirSync(blogDir).filter(file => file.endsWith('.md') || file.endsWith('.mdx'));
  const categoriesSet = new Set();

  files.forEach(file => {
    const content = fs.readFileSync(path.join(blogDir, file), 'utf-8');
    // Extract date from frontmatter (e.g. date: "2024-6-8")
    const dateMatch = content.match(/date:\s*["']?(\d{4}[-/]\d{1,2}[-/]\d{1,2})["']?/);
    // Extract categories regex (simple line match)
    const catMatch = content.match(/categories:\s*\[(.*?)\]/);

    // Handle Categories
    if (catMatch) {
      const cats = catMatch[1].split(',').map(c => c.trim().replace(/['"]/g, ''));
      cats.forEach(c => {
        if (c) categoriesSet.add(c);
      });
    }

    // Handle Date Redirects
    if (dateMatch) {
      const dateStr = dateMatch[1];
      const slug = file.replace(/\.mdx?$/, '');

      // Ensure date parts are padded (e.g. 2024-6-8 -> 2024/06/08)
      const [year, month, day] = dateStr.split(/[-/]/).map(num => num.padStart(2, '0'));

      const oldPath = `/${year}/${month}/${day}/${slug}`;
      const newPath = `/blogs/${slug}`;

      // Add redirect
      redirects[oldPath] = newPath;
    }
  });

  // Generate Category Redirects: /[category]/ -> /categories/[category]/
  categoriesSet.forEach(cat => {
    redirects[`/${cat}`] = `/categories/${cat}`;
  });

  return redirects;
};

// https://astro.build/config
export default defineConfig({
  site: 'https://mozi1924.com',
  vite: {
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          assetFileNames: '_astro/style.[hash][extname]',
        },
      },
    },
  },

  integrations: [react(), sitemap(), mdx()],

  adapter: cloudflare(),

  redirects: generateBlogRedirects()
});