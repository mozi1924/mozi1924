import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const USERNAME = 'mozi1924';
const TOKEN = process.env.GITHUB_TOKEN || '';
const HEADERS = {
  'User-Agent': 'mozi1924-github-pages-builder',
  'Accept': 'application/vnd.github.v3+json',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

// Blacklist repos that shouldn't appear as standalone showcase projects
const BLACKLIST = new Set([
  'mozi1924.github.io', // Avoid self-referencing
  'mtk-ci-assets',      // Temporary CI assets
]);

// Helper to create a clean URL slug
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

// Helper to escape strings for YAML frontmatter
function yamlEscape(str) {
  if (!str) return '""';
  return JSON.stringify(str);
}

// Convert relative markdown & HTML image/link paths to absolute GitHub raw / blob URLs
function fixRelativeLinks(content, owner, repo, defaultBranch) {
  const branch = defaultBranch || 'main';
  const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`;
  const blobBase = `https://github.com/${owner}/${repo}/blob/${branch}`;

  // 1. Fix Markdown images: ![alt](relative_path "optional title")
  let fixed = content.replace(
    /!\[([^\]]*)\]\((?!https?:\/\/|data:|#|\/)([^)\s]+)(?:\s+["']([^"']*)["'])?\)/g,
    (match, alt, relPath, title) => {
      const cleanPath = relPath.replace(/^\.?\//, '');
      const fullUrl = `${rawBase}/${cleanPath}`;
      return title ? `![${alt}](${fullUrl} "${title}")` : `![${alt}](${fullUrl})`;
    }
  );

  // 2. Fix HTML <img> tags with relative src: <img ... src="path" ...>
  fixed = fixed.replace(
    /(<img\b[^>]*?\bsrc=["'])(?!https?:\/\/|data:|\/)([^"']+)(["'][^>]*>)/gi,
    (match, prefix, relPath, suffix) => {
      const cleanPath = relPath.replace(/^\.?\//, '');
      return `${prefix}${rawBase}/${cleanPath}${suffix}`;
    }
  );

  // 3. Fix links with nested markdown or image: [text or ![img](...)](relative_path)
  // Handles both [text](path) and [![badge](img)](path)
  fixed = fixed.replace(
    /\[((?:!\[[^\]]*\]\([^)]*\)|[^\]])+)\]\((?!https?:\/\/|mailto:|data:|#|\/)([^)\s]+)(?:\s+["']([^"']*)["'])?\)/g,
    (match, text, relPath, title) => {
      const cleanPath = relPath.replace(/^\.?\//, '');
      const fullUrl = `${blobBase}/${cleanPath}`;
      return title ? `[${text}](${fullUrl} "${title}")` : `[${text}](${fullUrl})`;
    }
  );

  return fixed;
}

async function fetchAllRepos() {
  console.log(`[Sync] Fetching public repositories for user: ${USERNAME}...`);
  let page = 1;
  const allRepos = [];

  while (true) {
    const url = `https://api.github.com/users/${USERNAME}/repos?per_page=100&page=${page}&type=public&sort=pushed`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      throw new Error(`Failed to fetch repos: ${res.status} ${res.statusText}`);
    }
    const repos = await res.json();
    if (!Array.isArray(repos) || repos.length === 0) break;
    allRepos.push(...repos);
    if (repos.length < 100) break;
    page++;
  }

  console.log(`[Sync] Found total ${allRepos.length} public repos.`);
  return allRepos;
}

async function fetchReadme(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/readme`;
  const res = await fetch(url, {
    headers: {
      ...HEADERS,
      Accept: 'application/vnd.github.raw',
    },
  });

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    console.warn(`[Sync] Warning: Failed to fetch readme for ${repo}: ${res.status}`);
    return null;
  }
  return await res.text();
}

async function fetchPinnedRepos() {
  console.log(`[Sync] Fetching pinned repositories via GitHub GraphQL API...`);
  const query = `
    query {
      user(login: "${USERNAME}") {
        pinnedItems(first: 6, types: REPOSITORY) {
          nodes {
            ... on Repository {
              name
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      console.warn(`[Sync] GraphQL request failed (${res.status}), skipping pinned repos.`);
      return [];
    }

    const data = await res.json();
    const nodes = data?.data?.user?.pinnedItems?.nodes || [];
    const pinnedNames = nodes.map((n) => n.name).filter(Boolean);
    console.log(`[Sync] Found ${pinnedNames.length} pinned repositories on profile:`, pinnedNames);
    return pinnedNames;
  } catch (err) {
    console.warn('[Sync] Warning: Failed to fetch pinned repositories:', err.message);
    return [];
  }
}

async function main() {
  const projectsDir = path.join(rootDir, 'src', 'content', 'projects');
  const dataDir = path.join(rootDir, 'src', 'data');
  await fs.mkdir(projectsDir, { recursive: true });
  await fs.mkdir(dataDir, { recursive: true });

  const [rawRepos, pinnedRepoNames] = await Promise.all([
    fetchAllRepos(),
    fetchPinnedRepos(),
  ]);

  const pinnedSet = new Set(pinnedRepoNames);

  // Filter out blacklisted and forked repositories (keeping user's original work)
  const repos = rawRepos.filter((r) => {
    if (r.fork) return false;
    if (BLACKLIST.has(r.name)) return false;
    return true;
  });

  console.log(`[Sync] Processing ${repos.length} non-fork public repositories...`);

  const projectSummaries = [];
  const languageStats = {};
  let totalStars = 0;
  let totalForks = 0;

  for (const repo of repos) {
    console.log(`[Sync] Fetching details for ${repo.name}...`);
    totalStars += repo.stargazers_count;
    totalForks += repo.forks_count;
    if (repo.language) {
      languageStats[repo.language] = (languageStats[repo.language] || 0) + 1;
    }

    let readmeContent = await fetchReadme(repo.owner.login, repo.name);
    if (readmeContent) {
      readmeContent = fixRelativeLinks(
        readmeContent,
        repo.owner.login,
        repo.name,
        repo.default_branch
      );
    } else {
      readmeContent = `## ${repo.name}\n\n${
        repo.description || 'No README provided for this repository.'
      }\n\n[View original repository on GitHub](${repo.html_url})\n`;
    }

    const isPinned = pinnedSet.has(repo.name);
    const pinnedOrder = isPinned ? pinnedRepoNames.indexOf(repo.name) : -1;
    const slug = slugify(repo.name);
    const topicsJson = JSON.stringify(repo.topics || []);
    const frontmatter = [
      '---',
      `title: ${yamlEscape(repo.name)}`,
      `name: ${yamlEscape(repo.name)}`,
      `slug: ${yamlEscape(slug)}`,
      `pinned: ${isPinned ? 'true' : 'false'}`,
      `pinnedOrder: ${pinnedOrder}`,
      `description: ${yamlEscape(repo.description || '')}`,
      `repoUrl: ${yamlEscape(repo.html_url)}`,
      `homepage: ${yamlEscape(repo.homepage || '')}`,
      `stars: ${repo.stargazers_count}`,
      `forks: ${repo.forks_count}`,
      `language: ${yamlEscape(repo.language || 'Other')}`,
      `topics: ${topicsJson}`,
      `license: ${yamlEscape(repo.license?.spdx_id || repo.license?.name || '')}`,
      `createdAt: ${yamlEscape(repo.created_at)}`,
      `pushedAt: ${yamlEscape(repo.pushed_at)}`,
      `defaultBranch: ${yamlEscape(repo.default_branch)}`,
      `archived: ${repo.archived ? 'true' : 'false'}`,
      '---',
      '',
    ].join('\n');

    const filePath = path.join(projectsDir, `${repo.name}.md`);
    await fs.writeFile(filePath, frontmatter + readmeContent, 'utf-8');

    projectSummaries.push({
      name: repo.name,
      slug,
      pinned: isPinned,
      pinnedOrder,
      description: repo.description || '',
      repoUrl: repo.html_url,
      homepage: repo.homepage || '',
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language || 'Other',
      topics: repo.topics || [],
      license: repo.license?.spdx_id || repo.license?.name || '',
      createdAt: repo.created_at,
      pushedAt: repo.pushed_at,
      archived: repo.archived,
    });
  }

  // Sort summaries by stars descending by default
  projectSummaries.sort((a, b) => b.stars - a.stars);

  // Write metadata JSON files
  await fs.writeFile(
    path.join(dataDir, 'projects.json'),
    JSON.stringify(projectSummaries, null, 2),
    'utf-8'
  );

  const stats = {
    updatedAt: new Date().toISOString(),
    totalProjects: projectSummaries.length,
    totalStars,
    totalForks,
    pinnedProjects: pinnedRepoNames,
    languages: languageStats,
  };

  await fs.writeFile(
    path.join(dataDir, 'stats.json'),
    JSON.stringify(stats, null, 2),
    'utf-8'
  );

  console.log(`[Sync] Successfully processed ${projectSummaries.length} projects!`);
  console.log(`[Sync] Stats: ${totalStars} Stars, ${totalForks} Forks.`);
}

main().catch((err) => {
  console.error('[Sync] Error during sync:', err);
  process.exit(1);
});
