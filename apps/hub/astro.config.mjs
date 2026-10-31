import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read projects summary for accurate lastmod and priority metadata in Sitemap
let projectsData = [];
try {
  const projectsFilePath = path.resolve(__dirname, 'src/data/projects.json');
  projectsData = JSON.parse(fs.readFileSync(projectsFilePath, 'utf-8'));
} catch (e) {
  console.warn('[astro.config.mjs] Failed to load projects.json for sitemap lastmod:', e);
}

const projectMap = new Map();
for (const p of projectsData) {
  if (p.slug) {
    projectMap.set(p.slug.toLowerCase(), p);
  }
  if (p.name) {
    projectMap.set(p.name.toLowerCase(), p);
  }
}

// Calculate the latest pushedAt for the hub root
const latestGlobalPushedAt = projectsData.reduce((latest, p) => {
  if (!p.pushedAt) return latest;
  const t = new Date(p.pushedAt).getTime();
  return t > latest ? t : latest;
}, 0);

export default defineConfig({
  site: process.env.SITE_URL || 'https://hub.mozi1924.com',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404') && !page.endsWith('/projects/'),
      serialize(item) {
        try {
          const url = new URL(item.url);
          const pathname = url.pathname.replace(/\/+$/, '');

          // Root index page: top priority, daily crawl, latest repo push as lastmod
          if (pathname === '' || pathname === '/') {
            item.changefreq = 'daily';
            item.priority = 1.0;
            if (latestGlobalPushedAt > 0) {
              item.lastmod = new Date(latestGlobalPushedAt).toISOString();
            }
            return item;
          }

          // Project detail pages: /projects/[slug]
          const match = pathname.match(/^\/projects\/([^/]+)$/);
          if (match) {
            const slug = decodeURIComponent(match[1]).toLowerCase();
            const project = projectMap.get(slug);
            if (project) {
              item.changefreq = project.archived ? 'monthly' : 'weekly';
              item.priority = project.pinned ? 0.9 : 0.8;
              if (project.pushedAt) {
                item.lastmod = new Date(project.pushedAt).toISOString();
              }
            } else {
              item.changefreq = 'weekly';
              item.priority = 0.7;
            }
            return item;
          }
        } catch {
          // Fallback if URL parsing fails
        }
        return item;
      },
    }),
  ],
});
