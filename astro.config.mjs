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
      const removedFiles = [];

      async function findRemovedFiles(currentDir) {
        let entries;
        try {
          entries = await fs.readdir(currentDir, { withFileTypes: true });
        } catch (e) { return; }

        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          if (entry.isDirectory()) {
            await findRemovedFiles(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.mjs')) {
            const content = await fs.readFile(fullPath, 'utf8');
            if (content.trim() === "// Contents removed by Astro as it's used for prerendering only") {
              removedFiles.push(path.relative(workerDir, fullPath));
              await fs.unlink(fullPath);
            }
          }
        }
      }

      await findRemovedFiles(workerDir);

      if (removedFiles.length === 0) return;

      // 创建一个共享的空文件来接管所有被删除的页面引用
      const removedPlaceholder = 'pages/removed.mjs';
      const placeholderPath = path.join(workerDir, removedPlaceholder);
      await fs.mkdir(path.dirname(placeholderPath), { recursive: true });
      await fs.writeFile(placeholderPath, 'export default {};', 'utf8');

      async function updateReferences(filePath) {
        try {
          let content = await fs.readFile(filePath, 'utf8');
          let changed = false;
          for (const file of removedFiles) {
            if (content.includes(file)) {
              content = content.replaceAll(file, removedPlaceholder);
              changed = true;
            }
          }
          if (changed) await fs.writeFile(filePath, content, 'utf8');
        } catch (e) {}
      }

      // 更新入口和清单文件中的引用
      await updateReferences(path.join(workerDir, 'index.js'));
      const rootEntries = await fs.readdir(workerDir);
      for (const entry of rootEntries) {
        if (entry.startsWith('manifest_') && entry.endsWith('.mjs')) {
          await updateReferences(path.join(workerDir, entry));
        }
      }

      async function removeEmptyDirs(currentDir) {
        let entries;
        try {
          entries = await fs.readdir(currentDir, { withFileTypes: true });
        } catch (e) { return; }

        for (const entry of entries) {
          if (entry.isDirectory()) {
            const fullPath = path.join(currentDir, entry.name);
            await removeEmptyDirs(fullPath);
            try {
              await fs.rmdir(fullPath);
            } catch (e) {}
          }
        }
      }

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