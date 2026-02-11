import { getCollection, type CollectionEntry } from "astro:content";

export type ArticleEntry = CollectionEntry<"article"> | CollectionEntry<"blog">;

export interface SeriesGroup {
    type: "series";
    slug: string; // The folder name
    metadata: ArticleEntry; // The index.mdx of the series
    posts: ArticleEntry[];
    lastModDate: Date;
    createDate: Date;
}

export interface SingleArticle {
    type: "single";
    article: ArticleEntry;
}

export type ArticleItem = SeriesGroup | SingleArticle;

export async function getArticleList(collection: "article" | "blog" = "article"): Promise<ArticleItem[]> {
    const allArticles = await getCollection(collection);
    const items: ArticleItem[] = [];

    // Group by root folder
    const groups = new Map<string, ArticleEntry[]>();

    for (const article of allArticles) {
        const root = article.slug.split('/')[0];
        if (!groups.has(root)) {
            groups.set(root, []);
        }
        groups.get(root)!.push(article);
    }

    for (const [folder, posts] of groups) {
        // Check if this group is a series
        // Criteria: More than 1 post AND has an index post
        // Index post is one where slug === folder (or folder/index if not stripped)

        const indexPost = posts.find(p => p.slug === folder || p.slug === `${folder}/index`);

        if (posts.length > 1 && indexPost) {
            // It's a series
            const chapters = posts.filter(p => p.id !== indexPost.id);
            // Calculate dates
            const dates = posts.map((a: ArticleEntry) => new Date(a.data.date).getTime());
            const modDates = posts.map((a: ArticleEntry) => new Date(a.data.modDate || a.data.date).getTime());

            const createDate = new Date(Math.min(...dates));
            const lastModDate = new Date(Math.max(...modDates));

            items.push({
                type: "series",
                slug: folder,
                metadata: indexPost,
                posts: chapters.sort((a: ArticleEntry, b: ArticleEntry) => {
                    const idxA = 'seriesIndex' in a.data ? a.data.seriesIndex : 999;
                    const idxB = 'seriesIndex' in b.data ? b.data.seriesIndex : 999;
                    return (idxA || 999) - (idxB || 999);
                }),
                createDate,
                lastModDate
            });
        } else {
            // All posts in this group are single articles (usually just 1, strictly speaking)
            // But if there are multiple parts but NO index, we simply treat them all as single articles to avoid hiding content
            for (const post of posts) {
                items.push({
                    type: "single",
                    article: post
                });
            }
        }
    }

    // Sort all items by date (newest first)
    return items.sort((a, b) => {
        const dateA = a.type === "series" ? a.createDate : new Date(a.article.data.date);
        const dateB = b.type === "series" ? b.createDate : new Date(b.article.data.date);
        return dateB.getTime() - dateA.getTime();
    });
}

export async function getSeriesNavigation(currentSlug: string) {
    const allArticles = await getCollection("article");
    const folder = currentSlug.split('/')[0];

    // Find all posts in this folder
    const groupPosts = allArticles.filter(a => a.slug.startsWith(folder + '/') || a.slug === folder);

    // Check if it's actually a series (has index)
    const indexPost = groupPosts.find(p => p.slug === folder || p.slug === `${folder}/index`);

    if (!indexPost || groupPosts.length <= 1) {
        return null;
    }

    // If we are ON the index page, navigation might be different (e.g. Start Reading -> Part 1)
    // But usually navigation shows Prev/Next chapter. 
    // If on index, maybe Next -> Part 1?
    // Let's exclude index from the "navigation flow" generally, OR include it as "Part 0"?
    // The previous logic excluded index. Let's keep excluding index from "Prev/Next" flow between chapters.

    const isIndex = currentSlug === indexPost.slug || currentSlug === indexPost.slug.replace(/\/index$/, "");

    if (isIndex) {
        // We are at index.
        return null;
    }

    const seriesPosts = groupPosts.filter(p => p.id !== indexPost.id);

    // Sort by seriesIndex
    const sorted = seriesPosts.sort((a: ArticleEntry, b: ArticleEntry) => {
        const idxA = 'seriesIndex' in a.data ? a.data.seriesIndex : 999;
        const idxB = 'seriesIndex' in b.data ? b.data.seriesIndex : 999;
        return (idxA || 999) - (idxB || 999);
    });

    const currentIndex = sorted.findIndex((a: ArticleEntry) => a.slug === currentSlug);
    if (currentIndex === -1) return null;

    const currentPost = sorted[currentIndex];
    const seriesIndex = 'seriesIndex' in currentPost.data ? currentPost.data.seriesIndex : undefined;

    return {
        prev: sorted[currentIndex - 1] || null,
        next: sorted[currentIndex + 1] || null,
        seriesIndex,
        total: sorted.length
    };
}

export async function getSeriesContent(currentSlug: string) {
    const allArticles = await getCollection("article");
    const folder = currentSlug.split('/')[0];

    const groupPosts = allArticles.filter(a => a.slug.startsWith(folder + '/') || a.slug === folder);
    const indexPost = groupPosts.find(p => p.slug === folder || p.slug === `${folder}/index`);

    if (!indexPost || groupPosts.length <= 1) {
        return null;
    }

    // If current slug matches index post slug, then we are on the landing page
    const isIndex = currentSlug === indexPost.slug || currentSlug === indexPost.slug.replace(/\/index$/, "");
    if (isIndex) {
        const chapters = groupPosts.filter(p => p.id !== indexPost.id);
        return {
            isSeriesIndex: true,
            chapters: chapters.sort((a, b) => {
                const idxA = 'seriesIndex' in a.data ? a.data.seriesIndex : 999;
                const idxB = 'seriesIndex' in b.data ? b.data.seriesIndex : 999;
                return (idxA || 999) - (idxB || 999);
            })
        };
    }

    return null;
}

export async function getSeriesList(currentSlug: string) {
    const allArticles = await getCollection("article");
    const folder = currentSlug.split('/')[0];

    // Find all posts in this folder
    const groupPosts = allArticles.filter(a => a.slug.startsWith(folder + '/') || a.slug === folder);

    // Check if it's actually a series (has index)
    const indexPost = groupPosts.find(p => p.slug === folder || p.slug === `${folder}/index`);

    if (!indexPost || groupPosts.length <= 1) {
        return null;
    }

    const chapters = groupPosts.filter(p => p.id !== indexPost.id);
    const sortedChapters = chapters.sort((a, b) => {
        const idxA = a.data.seriesIndex ?? 999;
        const idxB = b.data.seriesIndex ?? 999;
        return idxA - idxB;
    });

    return {
        title: indexPost.data.title,
        chapters: sortedChapters
    };
}

/**
 * Normalizes post data from both 'blog' and 'article' collections
 * into a unified format for layouts.
 */
export function getNormalizedPostData(post: CollectionEntry<"blog"> | CollectionEntry<"article">, type: "blog" | "article") {
    return {
        title: post.data.title,
        date: post.data.date,
        image: post.data.image,
        desc: post.data.desc,
        modDate: post.data.modDate,
        authorId: post.data.authorId || "mozi",
        disable_comments: (post.collection === 'blog' ? post.data.disable_comments : (post.data as any).hideComment) || false,
        pageType: type,
        slug: post.slug,
        id: post.id
    };
}
