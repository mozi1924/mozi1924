import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

const cleanPrerenderedFiles = {
  name: 'clean-prerendered-files',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      const workerDir = path.join(fileURLToPath(dir), '_worker.js');

      async function processDir(currentDir) {
        let entries;
        try {
          entries = await fs.readdir(currentDir, { withFileTypes: true });
        } catch (e) {
          return;
        }

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          if (entry.isDirectory()) {
            await processDir(fullPath);
          } else if (entry.isFile()) {
            const content = await fs.readFile(fullPath, 'utf8');
            if (content.trim() === "// Contents removed by Astro as it's used for prerendering only") {
              await fs.unlink(fullPath);
            }
          }
        }
      }

      async function removeEmptyDirs(currentDir) {
        let entries;
        try {
          entries = await fs.readdir(currentDir, { withFileTypes: true });
        } catch (e) {
          return;
        }

        for (const entry of entries) {
          if (entry.isDirectory()) {
            const fullPath = path.join(currentDir, entry.name);
            await removeEmptyDirs(fullPath);
            // 尝试删除，如果不是空的会报错，所以需要 catch
            try {
              await fs.rmdir(fullPath);
            } catch (e) {
              // Ignore folders that are not empty
            }
          }
        }
      }

      await processDir(workerDir);
      await removeEmptyDirs(workerDir);
    }
  }
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
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return '_astro/style.[hash][extname]';
            }
            if (/\.(gif|jpe?g|png|svg|webp|avif|ico)$/i.test(assetInfo.name || '')) {
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
    sitemap(),
    mdx(),
    cleanPrerenderedFiles,
  ],

  output: "static",

  adapter: cloudflare({
    imageService: 'compile',
  }),
});