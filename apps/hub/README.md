# Mozi's Open Source Hub (`hub.mozi1924.com`)

Automated GitHub repository showcase and developer portal for **Mozi Arasaka** ([@mozi1924](https://github.com/mozi1924)), hosted at [https://hub.mozi1924.com](https://hub.mozi1924.com).

## 🚀 Features

- **Automated Sync**: Scans all public repositories across user (@mozi1924) and organizations (e.g. MoziToolKit) via GitHub REST API, extracts READMEs, and fixes relative links & media URLs.
- **Modern Dark UI**: Aesthetic aligned with [mozi1924.com](https://mozi1924.com) using shared `@mozi/ui` components, Tailwind CSS v4, and modern dark tokens.
- **Search & Filtering**: Real-time client-side search by repo name, description, topic tags, and programming language.
- **SEO & Google Indexing**: Auto-generates standard `sitemap.xml`, `robots.txt`, and Schema.org `SoftwareSourceCode` JSON-LD rich snippets.
- **Edge Deployment**: Deployed globally via Cloudflare Pages edge network, automatically synchronized on midnight cron.

## 🛠️ Development

```bash
# Install dependencies from monorepo root
pnpm install

# Sync public repos from GitHub (requires GITHUB_TOKEN for unthrottled API access)
pnpm --filter @mozi/hub sync

# Start development server
pnpm --filter @mozi/hub dev

# Build static production bundle
pnpm --filter @mozi/hub build
```

## 🌐 Deployment

The Hub site is deployed to Cloudflare Pages as `hub-mozi1924-com` serving `hub.mozi1924.com`. Legacy traffic to `mozi1924.github.io` is seamlessly forwarded via the redirector repository.
