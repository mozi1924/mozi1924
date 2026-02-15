import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import indexnow from 'astro-indexnow';
import { generateBlogRedirects } from './src/utils/redirects.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://mozi1924.com',
  vite: {
    plugins: [tailwindcss()],

    build: {
      rollupOptions: {
        external: ['/pagefind/pagefind.js'],
        output: {
          assetFileNames: '_astro/style.[hash][extname]',
        },
      },
    },
  },

  integrations: [
    react(),
    sitemap(),
    mdx(),
    indexnow({
      key: process.env.INDEXNOW_KEY,
    }),
    {
      name: 'fix-redirects-trailing-slash',
      hooks: {
        'astro:build:done': ({ dir }) => {
          const redirectsPath = new URL('_redirects', dir);
          if (fs.existsSync(redirectsPath)) {
            const content = fs.readFileSync(redirectsPath, 'utf-8');
            const lines = content.split('\n').filter(Boolean);
            const newLines = new Set();

            lines.forEach(line => {
              const parts = line.split(/\s+/);
              if (parts.length >= 2) {
                const from = parts[0];
                const to = parts[1];
                const code = parts[2] || 301;

                const fromNoSlash = from.replace(/\/$/, '');
                const fromWithSlash = fromNoSlash + '/';

                newLines.add(`${fromNoSlash}\t${to}\t${code}`);
                newLines.add(`${fromWithSlash}\t${to}\t${code}`);
              }
            });

            fs.writeFileSync(redirectsPath, Array.from(newLines).join('\n'));
            console.log(`[fix-redirects] Updated _redirects with ${newLines.size} rules.`);
          }
        }
      }
    }
  ],

  adapter: cloudflare({
    imageService: 'compile',
  }),

  redirects: generateBlogRedirects()
});