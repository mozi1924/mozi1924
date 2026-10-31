#!/usr/bin/env node
/**
 * archive-to-wayback.mjs
 *
 * 自动将网站新增/修改页面提交至 Wayback Machine (Archive.org) 的 Save Page Now 2 (SPN2) API。
 * 支持自定义域名路径映射、Git diff 增量变更检测、Sitemap 解析、速率控制与失败重试。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '../..');

// 1. 读取命令行参数与环境变量
const args = process.argv.slice(2);
function getArg(name, fallback = null) {
  const prefix = `--${name}=`;
  const found = args.find((a) => a.startsWith(prefix));
  if (found) return found.slice(prefix.length);
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) {
    return args[idx + 1];
  }
  return fallback;
}
const hasFlag = (name) => args.includes(`--${name}`);

// 模式：changed (默认增量) | all (全量 sitemap) | custom (指定 urls)
const mode = getArg('mode', process.env.ARCHIVE_MODE || 'changed');
const rawCustomUrls = getArg('urls', process.env.ARCHIVE_URLS || '');
const isDryRun = hasFlag('dry-run') || process.env.ARCHIVE_DRY_RUN === 'true';

// 自定义域名（优先取环境变量 CUSTOM_DOMAIN 或 SITE_URL，默认 https://mozi1924.com）
const rawDomain =
  getArg('domain', process.env.CUSTOM_DOMAIN || process.env.SITE_URL || 'https://mozi1924.com');
const customDomain = rawDomain.replace(/\/+$/, '');

// Archive.org S3 凭据 (通过 GitHub Secrets 传入)
const accessKey = process.env.ARCHIVE_ACCESS_KEY || '';
const secretKey = process.env.ARCHIVE_SECRET_KEY || '';

// 速率控制与重试配置
const delayMs = parseInt(getArg('delay', process.env.ARCHIVE_DELAY_MS || '2500'), 10);
const maxRetries = parseInt(getArg('retries', process.env.ARCHIVE_MAX_RETRIES || '3'), 10);

// Git 变更 SHA 范围
const beforeSha = process.env.GITHUB_BEFORE_SHA || getArg('before-sha', null);
const headSha = process.env.GITHUB_SHA || getArg('head-sha', null);

/**
 * 睡眠工具函数
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 将任意路径转换为自定义域名下的完整 URL
 * 确保保留原始路径后缀，并规范化斜杠与 URL 编码
 */
function toCustomDomainUrl(inputPathOrUrl) {
  try {
    let pathname = inputPathOrUrl;
    if (inputPathOrUrl.startsWith('http://') || inputPathOrUrl.startsWith('https://')) {
      const parsed = new URL(inputPathOrUrl);
      pathname = parsed.pathname;
    }
    // 保证以 / 开头
    if (!pathname.startsWith('/')) {
      pathname = '/' + pathname;
    }
    return new URL(pathname, customDomain).toString();
  } catch (err) {
    console.warn(`[archive] 无法格式化路径/URL: ${inputPathOrUrl}`, err);
    return null;
  }
}

/**
 * 从构建产物中的 sitemap-0.xml 或 sitemap-index.xml 提取所有已生成的页面 URL
 */
function getSitemapUrls() {
  const sitemapCandidates = [
    path.join(webRoot, 'dist/sitemap-0.xml'),
    path.join(webRoot, 'dist/client/sitemap-0.xml'),
    path.join(webRoot, 'dist/sitemap-index.xml'),
  ];

  for (const file of sitemapCandidates) {
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const locRegex = /<loc>(https?:\/\/[^<]+)<\/loc>/g;
        const urls = [];
        let match;
        while ((match = locRegex.exec(content)) !== null) {
          const rawUrl = match[1];
          // 如果是 sitemap-index，跳过子 sitemap 的引用
          if (rawUrl.endsWith('.xml')) continue;
          const mapped = toCustomDomainUrl(rawUrl);
          if (mapped) urls.push(mapped);
        }
        if (urls.length > 0) {
          return Array.from(new Set(urls));
        }
      } catch (err) {
        console.warn(`[archive] 读取 sitemap 文件 ${file} 失败:`, err);
      }
    }
  }
  return [];
}

/**
 * 获取 Git 变更的文件列表 (只保留新增 Added 和修改 Modified)
 */
function getChangedFilesFromGit() {
  try {
    let diffCmd = '';
    // 如果在 GitHub Actions 中有前后 commit SHA
    if (beforeSha && headSha && !/^0+$/.test(beforeSha)) {
      diffCmd = `git diff --name-status "${beforeSha}" "${headSha}"`;
    } else {
      // 本地或默认比对上一个 commit
      diffCmd = 'git diff --name-status HEAD~1 HEAD';
    }

    const output = execSync(diffCmd, { cwd: repoRoot, encoding: 'utf-8' });
    const files = [];

    for (const line of output.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // status: A (added), M (modified), D (deleted), R (renamed), etc.
      const parts = trimmed.split(/\s+/);
      const status = parts[0];
      const filePath = parts[parts.length - 1]; // 处理重命名情况

      // 只保留新增与修改，排除删除 (D)
      if (status.startsWith('A') || status.startsWith('M') || status.startsWith('R')) {
        files.push(filePath.replace(/\\/g, '/'));
      }
    }
    return files;
  } catch (err) {
    console.warn('[archive] 无法获取 git diff 变更文件:', err.message);
    return [];
  }
}

/**
 * 将源码文件路径匹配到前端路由相对路径
 */
function resolveFilePathToRoute(filePath) {
  const norm = filePath.replace(/\\/g, '/');

  // 1. 博客文章: apps/web/src/content/blog/xxx.mdx -> /blogs/xxx/
  const blogMatch = norm.match(/(?:^|\/)apps\/web\/src\/content\/blog\/(.+)\.(md|mdx)$/);
  if (blogMatch) {
    let slug = blogMatch[1].replace(/\/index$/, '');
    // 移除标点以匹配 Astro sitemap 的 normalizeSlug
    slug = slug.replace(/[，？?]/g, '').trim();
    return `/blogs/${encodeURI(slug)}/`;
  }

  // 2. 专题文章: apps/web/src/content/article/xxx.mdx -> /article/xxx/
  const articleMatch = norm.match(/(?:^|\/)apps\/web\/src\/content\/article\/(.+)\.(md|mdx)$/);
  if (articleMatch) {
    let slug = articleMatch[1].replace(/\/index$/, '');
    slug = slug.replace(/[，？?]/g, '').trim();
    return `/article/${encodeURI(slug)}/`;
  }

  // 3. 页面: apps/web/src/pages/xxx.(astro|md|mdx) -> /xxx/
  const pagesMatch = norm.match(/(?:^|\/)apps\/web\/src\/pages\/(.+)\.(astro|md|mdx)$/);
  if (pagesMatch) {
    let route = pagesMatch[1];
    if (route.startsWith('_') || route.startsWith('api/')) return null;
    if (route === '404') return null;
    if (route === 'index') return '/';
    route = route.replace(/\/index$/, '');
    return `/${encodeURI(route)}/`;
  }

  return null;
}

/**
 * 计算待归档的目标 URL 列表
 */
function collectTargetUrls() {
  const sitemapUrls = getSitemapUrls();
  const targetSet = new Set();

  if (mode === 'all') {
    console.log(`[archive] 模式: 全量 (all)，从 Sitemap 中读取所有页面...`);
    for (const url of sitemapUrls) {
      targetSet.add(url);
    }
    if (targetSet.size === 0) {
      console.warn('[archive] 未发现构建产物中的 sitemap，回退到归档首页');
      targetSet.add(toCustomDomainUrl('/'));
    }
    return Array.from(targetSet);
  }

  if (mode === 'custom' || rawCustomUrls) {
    console.log(`[archive] 模式: 自定义 URL (custom)...`);
    const list = rawCustomUrls.split(',').map((u) => u.trim()).filter(Boolean);
    for (const item of list) {
      const url = toCustomDomainUrl(item);
      if (url) targetSet.add(url);
    }
    return Array.from(targetSet);
  }

  // 默认: changed 增量变更模式
  console.log(`[archive] 模式: 增量检测 (changed)，正在分析 Git 变更文件...`);
  const changedFiles = getChangedFilesFromGit();
  console.log(`[archive] 检测到 Git 变更文件 ${changedFiles.length} 个:`);
  for (const f of changedFiles) {
    console.log(`  - ${f}`);
  }

  let hasArticleOrBlogChange = false;
  let hasGlobalLayoutChange = false;

  for (const file of changedFiles) {
    if (file.includes('src/content/blog/') || file.includes('src/content/article/')) {
      hasArticleOrBlogChange = true;
    }
    if (file.includes('src/layouts/') || file.includes('src/components/') || file.includes('src/styles/')) {
      hasGlobalLayoutChange = true;
    }

    const route = resolveFilePathToRoute(file);
    if (route) {
      const fullUrl = toCustomDomainUrl(route);
      if (fullUrl) {
        targetSet.add(fullUrl);
      }
    }
  }

  // 如果有文章更新或全局布局变更，必须一并归档首页及对应的列表页
  if (hasArticleOrBlogChange || hasGlobalLayoutChange || targetSet.size > 0) {
    targetSet.add(toCustomDomainUrl('/'));
    if (hasArticleOrBlogChange) {
      targetSet.add(toCustomDomainUrl('/blogs/'));
      targetSet.add(toCustomDomainUrl('/article/'));
    }
  }

  // 尝试使用 Sitemap 精准校正 URL 格式（若匹配）
  if (sitemapUrls.length > 0) {
    const finalSet = new Set();
    for (const target of targetSet) {
      const targetPath = new URL(target).pathname.replace(/\/+$/, '');
      // 在 sitemap 中寻找最匹配的 url
      const matched = sitemapUrls.find((smUrl) => {
        const smPath = new URL(smUrl).pathname.replace(/\/+$/, '');
        return smPath === targetPath || decodeURIComponent(smPath) === decodeURIComponent(targetPath);
      });
      if (matched) {
        finalSet.add(matched);
      } else {
        finalSet.add(target);
      }
    }
    return Array.from(finalSet);
  }

  return Array.from(targetSet);
}

/**
 * 单个 URL 提交到 Archive.org Save Page Now 2 (SPN2)
 */
async function archiveUrlWithRetry(url, attempt = 1) {
  const apiUrl = 'https://web.archive.org/save';
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 (compatible; MoziWebWaybackArchiver/1.0)',
  };

  // 添加 Archive.org S3 认证头 (LOW <access_key>:<secret_key>)
  if (accessKey && secretKey) {
    headers['Authorization'] = `LOW ${accessKey}:${secretKey}`;
  }

  const body = new URLSearchParams({
    url: url,
    capture_all: '1',         // 抓取页面所依赖的静态资源 (CSS, 图片, 字体)
    skip_first_archive: '1',   // 强制刷新并捕获最新版本
    delay_wb_availability: '1' // 异步入库，加快响应速度
  });

  if (isDryRun) {
    console.log(`[DRY-RUN] 将提交 POST ${apiUrl}，目标 URL: ${url}`);
    if (accessKey && secretKey) {
      console.log(`[DRY-RUN] 带 Authorization: LOW ${accessKey.slice(0, 4)}****:${secretKey.slice(0, 4)}****`);
    } else {
      console.log('[DRY-RUN] 无凭据，将进行匿名提交');
    }
    return { ok: true, status: 200, dryRun: true };
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: body.toString(),
    });

    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { rawText: text };
    }

    if (res.ok) {
      const jobId = data.job_id || 'submitted';
      return { ok: true, status: res.status, jobId, data };
    }

    // 遇 429 (Too Many Requests) 或 5xx 服务端繁忙，进行退避重试
    if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
      const backoffSec = attempt * 5;
      console.warn(`[archive] 收到 HTTP ${res.status} (${url})，等待 ${backoffSec} 秒后进行第 ${attempt + 1}/${maxRetries} 次重试...`);
      await sleep(backoffSec * 1000);
      return archiveUrlWithRetry(url, attempt + 1);
    }

    return {
      ok: false,
      status: res.status,
      error: data.message || data.error || text || `HTTP ${res.status}`,
    };
  } catch (err) {
    if (attempt < maxRetries) {
      const backoffSec = attempt * 4;
      console.warn(`[archive] 网络请求异常 (${url}): ${err.message}，等待 ${backoffSec} 秒后重试...`);
      await sleep(backoffSec * 1000);
      return archiveUrlWithRetry(url, attempt + 1);
    }
    return { ok: false, error: err.message };
  }
}

/**
 * 主执行函数
 */
async function main() {
  console.log('====================================================');
  console.log('   Archive.org Wayback Machine 页面自动归档工具');
  console.log('====================================================');
  console.log(`目标自定义域名: ${customDomain}`);
  console.log(`运行模式: ${mode} ${isDryRun ? '(DRY-RUN 演练模式)' : ''}`);
  if (accessKey && secretKey) {
    console.log(`凭据状态: 已配置 Archive.org S3 凭据 (Key ID: ${accessKey.slice(0, 4)}****)`);
  } else {
    console.log('凭据状态: ⚠️ 未配置 ARCHIVE_ACCESS_KEY / ARCHIVE_SECRET_KEY，将使用匿名限流模式');
    console.log('提示: 可在 GitHub Secrets 中配置 ARCHIVE_ACCESS_KEY 与 ARCHIVE_SECRET_KEY 获取更高配额');
  }

  const urlsToArchive = collectTargetUrls();

  if (urlsToArchive.length === 0) {
    console.log('\n[archive] ℹ️ 未发现需要归档的新增/修改页面，流程安全结束。');
    return;
  }

  console.log(`\n准备归档以下 ${urlsToArchive.length} 个页面 (自定义域名保留路径后缀):`);
  urlsToArchive.forEach((u, i) => console.log(`  [${i + 1}] ${u}`));
  console.log('');

  const results = [];

  for (let i = 0; i < urlsToArchive.length; i++) {
    const url = urlsToArchive[i];
    console.log(`[${i + 1}/${urlsToArchive.length}] 正在提交: ${url} ...`);

    const result = await archiveUrlWithRetry(url);
    results.push({ url, result });

    if (result.ok) {
      if (result.dryRun) {
        console.log(`  ✅ [DRY-RUN 成功模拟] 归档指令已就绪`);
      } else {
        console.log(`  ✅ 提交成功! Job ID: ${result.jobId}`);
        console.log(`  🔗 快照查看链接: https://web.archive.org/web/*/${url}`);
      }
    } else {
      console.log(`  ❌ 提交失败: [HTTP ${result.status || 'ERR'}] ${result.error}`);
    }

    // 速率控制：URL 之间间隔等待，防止被 Archive.org 限流
    if (i < urlsToArchive.length - 1 && !isDryRun) {
      await sleep(delayMs);
    }
  }

  // 最终汇总
  console.log('\n================ 归档执行结果汇总 ================');
  const successCount = results.filter((r) => r.result.ok).length;
  const failCount = results.length - successCount;
  console.log(`总计: ${results.length} | 成功: ${successCount} | 失败: ${failCount}`);
  console.log('====================================================');
}

main().catch((err) => {
  console.error('[archive] 脚本执行发生致命异常:', err);
  // 不阻断整体 CI/CD 流程
  process.exit(0);
});
