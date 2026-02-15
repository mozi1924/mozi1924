import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

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
  ],

  adapter: cloudflare({
    imageService: 'compile',
  }),
});