import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import indexnow from 'astro-indexnow';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateBlogRedirects } from './src/utils/redirects.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://mozi1924.com',
  trailingSlash: 'always',
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
          const redirectFile = path.join(fileURLToPath(dir), '_redirects');
          if (fs.existsSync(redirectFile)) {
            const content = fs.readFileSync(redirectFile, 'utf-8');
            const lines = content.split('\n');
            const newLines = lines.map(line => {
              const parts = line.trim().split(/\s+/);
              if (parts.length >= 2) {
                let [source, dest, status] = parts;
                // Add trailing slash to source if missing and not a file
                if (!source.endsWith('/') && !source.includes('.')) {
                  source = source + '/';
                }
                // Ensure dest has trailing slash if missing and not a file
                if (!dest.endsWith('/') && !dest.includes('.') && !dest.startsWith('http')) {
                  dest = dest + '/';
                }
                return `${source.padEnd(60)} ${dest.padEnd(60)} ${status || '301'}`;
              }
              return line;
            });
            fs.writeFileSync(redirectFile, newLines.join('\n'));
            console.log('Successfully fixed trailing slashes in _redirects');
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