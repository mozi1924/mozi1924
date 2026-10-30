import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const clientDir = path.join(distDir, 'client');
const serverDir = path.join(distDir, 'server');
const serverEntry = path.join(serverDir, 'entry.mjs');
const workerOutput = path.join(distDir, '_worker.js');
const routesOutput = path.join(distDir, '_routes.json');

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(clientDir))) {
    throw new Error('Missing dist/client. Run astro build first.');
  }

  if (!(await exists(serverDir)) || !(await exists(serverEntry))) {
    throw new Error('Missing dist/server/entry.mjs. Run astro build first.');
  }

  await cp(clientDir, distDir, {
    recursive: true,
    force: true,
    errorOnExist: false,
  });

  await build({
    entryPoints: [serverEntry],
    outfile: workerOutput,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    external: ['cloudflare:workers'],
    sourcemap: false,
    minify: false,
    logLevel: 'info',
  });

  await writeFile(
    routesOutput,
    JSON.stringify(
      {
        version: 1,
        include: ['/api/*', '/_image', '/_server-islands/*'],
        exclude: [
          '/_astro/*',
          '/fonts/*',
          '/pagefind/*',
          '/favicon.ico',
          '/favicon.svg',
          '/robots.txt',
          '/ads.txt',
          '/rss.xml',
          '/rss-articles.xml',
          '/rss-blogs.xml',
          '/sitemap-0.xml',
          '/sitemap-index.xml',
        ],
      },
      null,
      2,
    ),
  );

  await rm(clientDir, { recursive: true, force: true });
  await rm(serverDir, { recursive: true, force: true });

  console.log('Prepared Cloudflare Pages output at dist');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
