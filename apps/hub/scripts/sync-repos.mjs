import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const USERNAME = 'mozi1924';
const DEFAULT_ORGS = ['MoziToolKit'];
const ORGANIZATIONS = process.env.GITHUB_ORGS
  ? [...new Set([...process.env.GITHUB_ORGS.split(',').map((s) => s.trim()).filter(Boolean), ...DEFAULT_ORGS])]
  : DEFAULT_ORGS;

let token = process.env.GITHUB_TOKEN || '';
if (!token) {
  try {
    token = execSync('gh auth token', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {}
}
const TOKEN = token;

const HEADERS = {
  'User-Agent': 'mozi1924-hub-sync',
  'Accept': 'application/vnd.github.v3+json',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

// Blacklist repos that shouldn't appear as standalone showcase projects
const BLACKLIST = new Set([
  'mozi1924',           // Website & profile README repository
  'mozi1924.github.io', // Avoid self-referencing
  'mtk-ci-assets',      // Temporary CI assets
  '.github',            // Common org profile repo (.github) if any
]);

// Curated project images
const PROJECT_IMAGES = {
  'MoziToolKit': '/images/projects/mozitoolkit.webp',
  'rig2_addons': '/images/projects/rig2.webp',
  'Qwen3-TTS-EasyFinetuning': '/images/projects/qwen3-tts.webp',
  'openblive': '/images/projects/openblive.webp',
};

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
    (_match, alt, relPath, title) => {
      const cleanPath = relPath.replace(/^\.?\//, '');
      const fullUrl = `${rawBase}/${cleanPath}`;
      return title ? `![${alt}](${fullUrl} "${title}")` : `![${alt}](${fullUrl})`;
    }
  );

  // 2. Fix HTML <img> tags with relative src: <img ... src="path" ...>
  fixed = fixed.replace(
    /(<img\b[^>]*?\bsrc=["'])(?!https?:\/\/|data:|\/)([^"']+)(["'][^>]*>)/gi,
    (_match, prefix, relPath, suffix) => {
      const cleanPath = relPath.replace(/^\.?\//, '');
      return `${prefix}${rawBase}/${cleanPath}${suffix}`;
    }
  );

  // 3. Fix links with nested markdown or image: [text or ![img](...)](relative_path)
  // Handles both [text](path) and [![badge](img)](path)
  fixed = fixed.replace(
    /\[((?:!\[[^\]]*\]\([^)]*\)|[^\]])+)\]\((?!https?:\/\/|mailto:|data:|#|\/)([^)\s]+)(?:\s+["']([^"']*)["'])?\)/g,
    (_match, text, relPath, title) => {
      const cleanPath = relPath.replace(/^\.?\//, '');
      const fullUrl = `${blobBase}/${cleanPath}`;
      return title ? `[${text}](${fullUrl} "${title}")` : `[${text}](${fullUrl})`;
    }
  );

  return fixed;
}

async function fetchReposForTarget(target, isOrg = false) {
  const typeLabel = isOrg ? 'organization' : 'user';
  console.log(`[Sync] Fetching public repositories for ${typeLabel}: ${target}...`);
  let page = 1;
  const repos = [];

  while (true) {
    const endpoint = isOrg ? `orgs/${target}/repos` : `users/${target}/repos`;
    const url = `https://api.github.com/${endpoint}?per_page=100&page=${page}&type=public&sort=pushed`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.warn(`[Sync] Warning: Failed to fetch repos for ${typeLabel} ${target}: ${res.status} ${res.statusText}`);
      break;
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;
    repos.push(...data);
    if (data.length < 100) break;
    page++;
  }

  console.log(`[Sync] Found ${repos.length} public repos for ${typeLabel} ${target}.`);
  return repos;
}

async function fetchAllRepos() {
  const userRepos = await fetchReposForTarget(USERNAME, false);
  const orgReposList = await Promise.all(
    ORGANIZATIONS.map((org) => fetchReposForTarget(org, true))
  );

  const seenIds = new Set();
  const allRepos = [];

  for (const repo of [...userRepos, ...orgReposList.flat()]) {
    if (!seenIds.has(repo.id)) {
      seenIds.add(repo.id);
      allRepos.push(repo);
    }
  }

  console.log(`[Sync] Found total ${allRepos.length} public repos across user ${USERNAME} and orgs (${ORGANIZATIONS.join(', ')}).`);
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

async function fetchTodo(owner, repo, defaultBranch = 'main') {
  const branch = defaultBranch || 'main';
  const filenames = ['TODO.md', 'todo.md', 'Roadmap.md', 'ROADMAP.md'];

  for (const filename of filenames) {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filename}`;
    try {
      const res = await fetch(rawUrl, {
        headers: { 'User-Agent': 'mozi1924-hub-sync' },
      });
      if (res.ok) {
        let content = await res.text();
        content = fixRelativeLinks(content, owner, repo, branch);

        // Calculate task stats via regex
        const completedMatches = content.match(/^[\s]*[-*+]\s+\[[xX]\]/gm) || [];
        const pendingMatches = content.match(/^[\s]*[-*+]\s+\[\s\]/gm) || [];
        const completed = completedMatches.length;
        const pending = pendingMatches.length;
        const total = completed + pending;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          filename,
          content,
          stats: {
            total,
            completed,
            pending,
            percentage,
          },
        };
      }
    } catch {
      // Continue to next filename
    }
  }

  return null;
}

async function fetchReleases(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases?per_page=5`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (res.status === 404 || res.status === 403) {
      return [];
    }
    if (!res.ok) {
      console.warn(`[Sync] Warning: Failed to fetch releases for ${repo}: ${res.status}`);
      return [];
    }
    const releases = await res.json();
    if (!Array.isArray(releases)) return [];

    return releases.map((r) => ({
      id: r.id,
      tagName: r.tag_name,
      name: r.name || r.tag_name,
      publishedAt: r.published_at || r.created_at,
      prerelease: Boolean(r.prerelease),
      body: r.body || '',
      htmlUrl: r.html_url,
      assets: (r.assets || []).map((a) => ({
        name: a.name,
        size: a.size,
        downloadCount: a.download_count || 0,
        downloadUrl: a.browser_download_url,
      })),
    }));
  } catch (err) {
    console.warn(`[Sync] Error fetching releases for ${repo}:`, err.message);
    return [];
  }
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
      console.warn(`[Sync] GraphQL request failed (${res.status}), falling back to default pinned list.`);
      return ['MoziToolKit', 'rig2_addons', 'Qwen3-TTS-EasyFinetuning', 'openblive'];
    }

    const data = await res.json();
    const nodes = data?.data?.user?.pinnedItems?.nodes || [];
    const pinnedNames = nodes.map((n) => n.name).filter(Boolean);
    if (pinnedNames.length === 0) {
      console.log('[Sync] No pinned repos from GraphQL, using fallback pinned list.');
      return ['MoziToolKit', 'rig2_addons', 'Qwen3-TTS-EasyFinetuning', 'openblive'];
    }
    console.log(`[Sync] Found ${pinnedNames.length} pinned repositories on profile:`, pinnedNames);
    return pinnedNames;
  } catch (err) {
    console.warn('[Sync] Warning: Failed to fetch pinned repositories:', err.message, '- using fallback.');
    return ['MoziToolKit', 'rig2_addons', 'Qwen3-TTS-EasyFinetuning', 'openblive'];
  }
}

// Fetch overall GitHub activity metrics: PRs, Issues, Commits
async function fetchGitHubActivityStats(username, existingStats = {}) {
  console.log(`[Sync] Fetching global activity stats (PRs, Issues, Commits) for ${username}...`);
  let totalPRs = existingStats.totalPRs || 34;
  let totalIssues = existingStats.totalIssues || 13;
  let totalCommits = existingStats.totalCommits || 2680;

  try {
    const prRes = await fetch(
      `https://api.github.com/search/issues?q=author:${username}+type:pr`,
      { headers: HEADERS }
    );
    if (prRes.ok) {
      const data = await prRes.json();
      if (typeof data.total_count === 'number') {
        totalPRs = Math.max(data.total_count, totalPRs);
      }
    }
  } catch (e) {
    console.warn('[Sync] Could not fetch PR count:', e.message);
  }

  try {
    const issueRes = await fetch(
      `https://api.github.com/search/issues?q=author:${username}+type:issue`,
      { headers: HEADERS }
    );
    if (issueRes.ok) {
      const data = await issueRes.json();
      if (typeof data.total_count === 'number') {
        totalIssues = Math.max(data.total_count, totalIssues);
      }
    }
  } catch (e) {
    console.warn('[Sync] Could not fetch Issues count:', e.message);
  }

  try {
    const commitRes = await fetch(
      `https://api.github.com/search/commits?q=author:${username}`,
      {
        headers: {
          ...HEADERS,
          Accept: 'application/vnd.github.cloak-preview',
        },
      }
    );
    if (commitRes.ok) {
      const data = await commitRes.json();
      if (typeof data.total_count === 'number') {
        totalCommits = Math.max(data.total_count, totalCommits);
      }
    }
  } catch (e) {
    console.warn('[Sync] Could not fetch Commits count:', e.message);
  }

  console.log(`[Sync] Activity stats: ${totalCommits} Commits, ${totalPRs} PRs, ${totalIssues} Issues.`);
  return { totalCommits, totalPRs, totalIssues };
}

function parseContributionHtml(html) {
  const countMatch = html.match(/([\d,]+)\s+contributions/i);
  const totalContributions = countMatch ? parseInt(countMatch[1].replace(/,/g, ''), 10) : 0;

  const theadMatch = html.match(/<thead[^>]*>([\s\S]*?)<\/thead>/);
  const months = [];
  if (theadMatch) {
    const monthMatches = [...theadMatch[1].matchAll(/<td[^>]*colspan="(\d+)"[^>]*>[\s\S]*?<span aria-hidden="true"[^>]*>([^<]+)<\/span>/g)];
    for (const m of monthMatches) {
      months.push({
        colspan: parseInt(m[1], 10),
        name: m[2].trim(),
      });
    }
  }

  const tooltips = {};
  for (const m of html.matchAll(/<tool-tip[^>]*for="([^"]+)"[^>]*>([\s\S]*?)<\/tool-tip>/g)) {
    tooltips[m[1]] = m[2].trim().replace(/\s+/g, ' ');
  }

  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
  if (!tbodyMatch) return { totalContributions, months, weeks: [] };

  const rows = [...tbodyMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
  const matrix = [];
  for (let r = 0; r < rows.length; r++) {
    const rowHtml = rows[r][1];
    const tds = [...rowHtml.matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)];
    const dataTds = tds.filter((td) => !td[1].includes("ContributionCalendar-label"));
    matrix[r] = dataTds.map((td) => {
      const attrs = td[1];
      const dateM = attrs.match(/data-date="([^"]+)"/);
      if (!dateM) return null;
      const idM = attrs.match(/id="([^"]+)"/);
      const levelM = attrs.match(/data-level="([^"]+)"/);
      const date = dateM[1];
      const id = idM ? idM[1] : "";
      const level = levelM ? parseInt(levelM[1], 10) : 0;
      const tooltip = tooltips[id] || `${level > 0 ? level + ' contributions' : 'No contributions'} on ${date}`;
      let count = 0;
      const countM = tooltip.match(/(\d+)\s+contribution/i);
      if (countM) count = parseInt(countM[1], 10);
      return { date, level, count, tooltip };
    });
  }

  const maxWeeks = Math.max(...matrix.map((r) => r.length), 0);
  const weeks = [];
  for (let w = 0; w < maxWeeks; w++) {
    const weekDays = [];
    for (let d = 0; d < 7; d++) {
      weekDays.push(matrix[d]?.[w] || null);
    }
    weeks.push(weekDays);
  }

  return {
    totalContributions,
    months,
    weeks,
  };
}

async function fetchContributionCalendar(username, existingContributions = null) {
  console.log(`[Sync] Fetching contribution calendar for ${username}...`);
  const yearsToFetch = ['lastYear', '2026', '2025', '2024', '2023', '2022'];
  const calendarData = {
    updatedAt: new Date().toISOString(),
    availableYears: yearsToFetch,
    years: existingContributions?.years || {},
  };

  for (const year of yearsToFetch) {
    try {
      let url = `https://github.com/users/${username}/contributions`;
      if (year !== 'lastYear') {
        url = `https://github.com/users/${username}/contributions?from=${year}-01-01&to=${year}-12-31`;
      }
      console.log(`[Sync] Fetching contribution graph for ${year}...`);
      const res = await fetch(url, { headers: { 'User-Agent': 'mozi1924-hub-sync' } });
      if (res.ok) {
        const html = await res.text();
        const parsed = parseContributionHtml(html);
        if (parsed.weeks.length > 0) {
          calendarData.years[year] = parsed;
          console.log(`[Sync] Year ${year}: ${parsed.totalContributions} contributions, ${parsed.weeks.length} weeks.`);
        }
      } else {
        console.warn(`[Sync] Failed to fetch ${year} contribution data: ${res.status}`);
      }
    } catch (e) {
      console.warn(`[Sync] Error fetching ${year} calendar:`, e.message);
    }
  }

  return calendarData;
}

async function main() {
  const projectsDir = path.join(rootDir, 'src', 'content', 'projects');
  const dataDir = path.join(rootDir, 'src', 'data');
  await fs.mkdir(projectsDir, { recursive: true });
  await fs.mkdir(dataDir, { recursive: true });

  // Read existing stats/contributions/details if available
  let existingStats = {};
  let existingContributions = null;
  let existingProjectDetails = {};
  try {
    const raw = await fs.readFile(path.join(dataDir, 'stats.json'), 'utf-8');
    existingStats = JSON.parse(raw);
  } catch {}
  try {
    const raw = await fs.readFile(path.join(dataDir, 'contributions.json'), 'utf-8');
    existingContributions = JSON.parse(raw);
  } catch {}
  try {
    const raw = await fs.readFile(path.join(dataDir, 'project-details.json'), 'utf-8');
    existingProjectDetails = JSON.parse(raw);
  } catch {}

  const [rawRepos, pinnedRepoNames, activityStats, contributionCalendar] = await Promise.all([
    fetchAllRepos(),
    fetchPinnedRepos(),
    fetchGitHubActivityStats(USERNAME, existingStats),
    fetchContributionCalendar(USERNAME, existingContributions),
  ]);

  const pinnedSet = new Set(pinnedRepoNames);

  // Filter out blacklisted and forked repositories (keeping user's original work)
  const repos = rawRepos.filter((r) => {
    if (r.fork) return false;
    if (BLACKLIST.has(r.name)) return false;
    return true;
  });

  console.log(`[Sync] Processing ${repos.length} non-fork public repositories...`);

  // Clean up obsolete markdown files from blacklisted, private, or deleted repos
  try {
    const existingFiles = await fs.readdir(projectsDir);
    const validFileNames = new Set(repos.map((r) => `${r.name}.md`));
    for (const file of existingFiles) {
      if (file.endsWith('.md') && !validFileNames.has(file)) {
        console.log(`[Sync] Removing obsolete project markdown: ${file}`);
        await fs.unlink(path.join(projectsDir, file));
      }
    }
  } catch (err) {
    console.warn('[Sync] Warning: Failed to clean obsolete markdown files:', err.message);
  }

  const projectSummaries = [];
  const projectDetails = {};
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

    const prevDetails = existingProjectDetails[slug] || {};

    let todoData = await fetchTodo(repo.owner.login, repo.name, repo.default_branch);
    if (!todoData && prevDetails.todo) {
      todoData = prevDetails.todo;
    }

    let releasesData = await fetchReleases(repo.owner.login, repo.name);
    if ((!releasesData || releasesData.length === 0) && prevDetails.releases?.length > 0) {
      releasesData = prevDetails.releases;
    }

    projectDetails[slug] = {
      name: repo.name,
      slug,
      owner: repo.owner.login,
      todo: todoData || null,
      releases: releasesData || [],
    };

    const frontmatter = [
      '---',
      `title: ${yamlEscape(repo.name)}`,
      `name: ${yamlEscape(repo.name)}`,
      `slug: ${yamlEscape(slug)}`,
      `owner: ${yamlEscape(repo.owner.login)}`,
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
      owner: repo.owner.login,
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
      hasTodo: Boolean(todoData),
      todoPercentage: todoData?.stats?.percentage ?? null,
      hasReleases: (releasesData && releasesData.length > 0) || false,
      latestReleaseTag: releasesData?.[0]?.tagName ?? null,
      ...(PROJECT_IMAGES[repo.name] ? { image: PROJECT_IMAGES[repo.name] } : {}),
    });
  }

  // Sort summaries: pinned first, then by recently updated
  projectSummaries.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (a.pinned && b.pinned) return (a.pinnedOrder ?? 99) - (b.pinnedOrder ?? 99);
    const timeA = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
    const timeB = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
    if (timeB !== timeA) return timeB - timeA;
    return b.stars - a.stars;
  });

  // Write metadata JSON files
  await fs.writeFile(
    path.join(dataDir, 'projects.json'),
    JSON.stringify(projectSummaries, null, 2),
    'utf-8'
  );

  await fs.writeFile(
    path.join(dataDir, 'project-details.json'),
    JSON.stringify(projectDetails, null, 2),
    'utf-8'
  );

  const stats = {
    updatedAt: new Date().toISOString(),
    totalProjects: projectSummaries.length,
    totalStars,
    totalForks,
    totalCommits: activityStats.totalCommits,
    totalPRs: activityStats.totalPRs,
    totalIssues: activityStats.totalIssues,
    pinnedProjects: pinnedRepoNames,
    languages: languageStats,
  };

  await fs.writeFile(
    path.join(dataDir, 'stats.json'),
    JSON.stringify(stats, null, 2),
    'utf-8'
  );

  // Write contribution calendar data
  await fs.writeFile(
    path.join(dataDir, 'contributions.json'),
    JSON.stringify(contributionCalendar, null, 2),
    'utf-8'
  );

  console.log(`[Sync] Successfully processed ${projectSummaries.length} projects!`);
  console.log(`[Sync] Stats: ${totalStars} Stars, ${totalForks} Forks, ${activityStats.totalCommits} Commits, ${activityStats.totalPRs} PRs, ${activityStats.totalIssues} Issues.`);
  console.log(`[Sync] Contributions calendar saved for ${Object.keys(contributionCalendar.years).join(', ')}.`);
}

main().catch((err) => {
  console.error('[Sync] Error during sync:', err);
  process.exit(1);
});
