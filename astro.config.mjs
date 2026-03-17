import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// Fix: @astrojs/cloudflare forces react-dom/server.browser which uses MessageChannel
// (not available in Cloudflare Workers). Override to use the edge build instead.
const fixReactDomServerAlias = {
  name: 'fix-react-dom-server-alias',
  enforce: 'post',
  config(config) {
    const alias = config.resolve?.alias;
    if (Array.isArray(alias)) {
      const idx = alias.findIndex(a => a.find === 'react-dom/server');
      if (idx !== -1) alias[idx].replacement = 'react-dom/server.edge';
    } else if (alias && alias['react-dom/server']) {
      alias['react-dom/server'] = 'react-dom/server.edge';
    }
  },
};

// https://astro.build/config
export default defineConfig({
  site: 'https://mozi1924.com',
  vite: {
    plugins: [tailwindcss(), fixReactDomServerAlias],
    ssr: {
      resolve: {
        conditions: ['workerd', 'worker', 'module', 'browser'],
      },
    },
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

  output: "static",

  adapter: cloudflare({
    imageService: 'compile',
  }),
});