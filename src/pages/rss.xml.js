import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../config';

export async function GET(context) {
    const blogs = await getCollection('blog');
    const articles = await getCollection('article');

    // Combine and sort
    const allPosts = [...blogs, ...articles].sort((a, b) =>
        new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
    );

    return rss({
        title: SITE.title,
        description: SITE.description,
        site: context.site,
        items: allPosts.map((post) => {
            const isBlog = post.collection === 'blog';
            const base = isBlog ? '/blogs/' : '/article/';
            // Normalize slug: remove /index for articles
            const slug = post.slug.replace(/\/index$/, "");

            return {
                title: post.data.title,
                pubDate: new Date(post.data.date),
                description: post.data.desc || post.data.description,
                link: `${base}${slug}`,
            };
        }),
        customData: `<language>zh-cn</language>`,
    });
}
