# Mozi's Open Source Hub (`mozi1924.github.io`)

Automated GitHub repository showcase and developer portal for **Mozi Arasaka** ([@mozi1924](https://github.com/mozi1924)).

## 🚀 Features

- **Automated Sync**: Scans all public repositories via GitHub REST API, extracts READMEs, and fixes relative links & media URLs.
- **Modern Dark UI**: Aesthetic inspired by [mozi1924.com](https://mozi1924.com) with Audiowide typography, Tailwind CSS v4, and cyberpunk accents.
- **Search & Filtering**: Real-time client-side search by repo name, description, topic tags, and programming language.
- **SEO & Google Indexing**: Auto-generates standard `sitemap.xml`, `robots.txt`, and Schema.org `SoftwareSourceCode` JSON-LD rich snippets.
- **Zero-maintenance CI/CD**: Runs daily on GitHub Actions via cron schedule and deploys directly to GitHub Pages.

## 🛠️ Development

```bash
# Install dependencies
pnpm install

# Sync public repos from GitHub (requires GITHUB_TOKEN for unthrottled API access)
pnpm run sync

# Start development server
pnpm run dev

# Build static production bundle
pnpm run build
```

## 🌐 Custom Subdomain Setup

To attach this project to a custom subdomain of your personal domain (e.g., `projects.mozi1924.com`):

1. Go to repository **Settings** → **Pages** → **Custom domain** and input `projects.mozi1924.com`.
2. In Cloudflare DNS (or your DNS provider), add a `CNAME` record:
   - **Type**: `CNAME`
   - **Name**: `projects`
   - **Target**: `mozi1924.github.io`
   - **Proxy status**: DNS only (or Proxied, depending on SSL mode).
