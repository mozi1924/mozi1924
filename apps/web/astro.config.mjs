import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to normalize slugs
function normalizeSlug(str) {
  return str.replace(/[，？?]/g, '').trim();
}

// Lightweight frontmatter parser for sitemap metadata
function parseFrontmatterFile(filePath, filename) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return null;
    const yaml = match[1];

    const dateMatch = yaml.match(/\bdate:\s*["']?([0-9-]+)/);
    const modDateMatch = yaml.match(/\bmodDate:\s*["']?([0-9-]+)/);
    const langMatch = yaml.match(/\blang:\s*([a-zA-Z_-]+)/);

    const translations = [];
    const transBlock = yaml.match(/translations:\s*\n((?:\s+-\s+[\s\S]*?)(?=\n\S|$))/);
    if (transBlock) {
      const items = transBlock[1].split(/\n\s*-\s*/).filter(Boolean);
      for (const item of items) {
        const l = item.match(/lang:\s*["']?([a-zA-Z_-]+)["']?/);
        const s = item.match(/slug:\s*["']?([^"'\r\n]+)["']?/);
        if (l && s) {
          translations.push({ lang: l[1].trim(), slug: s[1].trim() });
        }
      }
    }

    const rawDate = modDateMatch ? modDateMatch[1] : (dateMatch ? dateMatch[1] : null);
    let lastmod = undefined;
    if (rawDate) {
      const parts = rawDate.split('-');
      if (parts.length === 3) {
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        lastmod = `${y}-${m}-${d}T00:00:00.000Z`;
      }
    }

    const baseSlug = filename.replace(/\.(md|mdx)$/, '');
    return {
      rawSlug: baseSlug,
      normSlug: normalizeSlug(baseSlug),
      lastmod,
      lang: langMatch ? langMatch[1] : undefined,
      translations,
    };
  } catch (err) {
    console.warn(`[sitemap] Failed to parse frontmatter from ${filename}:`, err);
    return null;
  }
}

// Pre-load article & blog metadata
const articleMap = new Map();
const blogMap = new Map();
let latestArticleDate = null;
let latestBlogDate = null;
let latestGlobalDate = null;

try {
  const articleDir = path.resolve(__dirname, 'src/content/article');
  if (fs.existsSync(articleDir)) {
    for (const f of fs.readdirSync(articleDir)) {
      if (f.endsWith('.md') || f.endsWith('.mdx')) {
        const data = parseFrontmatterFile(path.join(articleDir, f), f);
        if (data) {
          articleMap.set(data.rawSlug, data);
          articleMap.set(data.normSlug, data);
          if (data.lastmod && (!latestArticleDate || data.lastmod > latestArticleDate)) {
            latestArticleDate = data.lastmod;
          }
        }
      }
    }
  }

  const blogDir = path.resolve(__dirname, 'src/content/blog');
  if (fs.existsSync(blogDir)) {
    for (const f of fs.readdirSync(blogDir)) {
      if (f.endsWith('.md') || f.endsWith('.mdx')) {
        const data = parseFrontmatterFile(path.join(blogDir, f), f);
        if (data) {
          blogMap.set(data.rawSlug, data);
          blogMap.set(data.normSlug, data);
          if (data.lastmod && (!latestBlogDate || data.lastmod > latestBlogDate)) {
            latestBlogDate = data.lastmod;
          }
        }
      }
    }
  }

  if (latestArticleDate && latestBlogDate) {
    latestGlobalDate = latestArticleDate > latestBlogDate ? latestArticleDate : latestBlogDate;
  } else {
    latestGlobalDate = latestArticleDate || latestBlogDate;
  }
} catch (e) {
  console.warn('[sitemap] Failed to pre-index articles/blogs:', e);
}

// https://astro.build/config
export default defineConfig({
  site: 'https://mozi1924.com',
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    plugins: [tailwindcss()],
    build: {
      rollupOptions: {
        external: ['/pagefind/pagefind.js'],
        output: {
          assetFileNames: (assetInfo) => {
            const assetName = assetInfo.names?.[0] ?? '';
            if (assetName.endsWith('.css')) {
              return '_astro/style.[hash][extname]';
            }
            if (/\.(gif|jpe?g|png|svg|webp|avif|ico)$/i.test(assetName)) {
              return '_astro/image.[hash][extname]';
            }
            return '_astro/[name].[hash][extname]';
          },
        },
      },
    },
  },

  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !page.includes('/404') &&
        !page.includes('/mozi-rig/fadian') &&
        !page.endsWith('/categories/uncategorized/'),
      serialize(item) {
        try {
          const url = new URL(item.url);
          const pathname = decodeURIComponent(url.pathname.replace(/\/+$/, ''));

          // 1. Root Homepage
          if (pathname === '' || pathname === '/') {
            item.changefreq = 'daily';
            item.priority = 1.0;
            if (latestGlobalDate) item.lastmod = latestGlobalDate;
            return item;
          }

          // 2. Hub / Category Indexes
          if (pathname === '/article') {
            item.changefreq = 'daily';
            item.priority = 0.9;
            if (latestArticleDate) item.lastmod = latestArticleDate;
            return item;
          }
          if (pathname === '/blogs') {
            item.changefreq = 'daily';
            item.priority = 0.9;
            if (latestBlogDate) item.lastmod = latestBlogDate;
            return item;
          }
          if (pathname === '/categories') {
            item.changefreq = 'weekly';
            item.priority = 0.6;
            return item;
          }

          // 3. Articles (/article/[slug])
          const articleMatch = pathname.match(/^\/article\/(.+)$/);
          if (articleMatch) {
            const slug = articleMatch[1];
            const entry = articleMap.get(slug) || articleMap.get(normalizeSlug(slug));
            item.changefreq = 'monthly';
            item.priority = 0.85;
            if (entry) {
              if (entry.lastmod) item.lastmod = entry.lastmod;
              if (entry.translations && entry.translations.length > 0) {
                item.links = [
                  { lang: entry.lang || 'en', url: item.url },
                  ...entry.translations.map((t) => ({
                    lang: t.lang,
                    url: `https://mozi1924.com/article/${t.slug}/`,
                  })),
                ];
              }
            }
            return item;
          }

          // 4. Blogs (/blogs/[slug])
          const blogMatch = pathname.match(/^\/blogs\/(.+)$/);
          if (blogMatch) {
            const slug = blogMatch[1];
            const entry = blogMap.get(slug) || blogMap.get(normalizeSlug(slug));
            item.changefreq = 'monthly';
            item.priority = 0.8;
            if (entry) {
              if (entry.lastmod) item.lastmod = entry.lastmod;
              if (entry.translations && entry.translations.length > 0) {
                item.links = [
                  { lang: entry.lang || 'zh', url: item.url },
                  ...entry.translations.map((t) => ({
                    lang: t.lang,
                    url: `https://mozi1924.com/blogs/${t.slug}/`,
                  })),
                ];
              }
            }
            return item;
          }

          // 5. Mozi Rig Showcase & Docs
          if (pathname === '/mozi-rig') {
            item.changefreq = 'weekly';
            item.priority = 0.9;
            return item;
          }
          if (pathname === '/mozi-rig/system-flowcharts') {
            item.changefreq = 'monthly';
            item.priority = 0.7;
            item.lastmod = '2026-05-07T00:00:00.000Z';
            return item;
          }
          if (pathname === '/mozi-rig/legacy') {
            item.changefreq = 'yearly';
            item.priority = 0.5;
            return item;
          }

          // 6. Tools, About & Feeds
          if (pathname === '/about') {
            item.changefreq = 'monthly';
            item.priority = 0.8;
            return item;
          }
          if (pathname === '/my-mc-server' || pathname === '/text-to-archbase4-encryption-decryption') {
            item.changefreq = 'weekly';
            item.priority = 0.7;
            return item;
          }
          if (pathname.startsWith('/categories/')) {
            item.changefreq = 'weekly';
            item.priority = 0.6;
            return item;
          }
          if (pathname === '/rss') {
            item.changefreq = 'monthly';
            item.priority = 0.4;
            return item;
          }
        } catch {
          // Fallback
        }
        return item;
      },
    }),
    mdx(),
  ],

  output: "static",

  adapter: cloudflare({
    imageService: 'compile',
    prerenderEnvironment: 'node',
  }),
});
