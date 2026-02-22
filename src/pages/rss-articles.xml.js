import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../config';

export async function GET(context) {
    const articles = await getCollection('article');

    // Sort
    const sortedArticles = articles.sort((a, b) =>
        new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
    );

    return rss({
        title: `${SITE.title} - Articles`,
        description: "Articles from Mozi1924",
        site: context.site,
        items: sortedArticles.map((post) => {
            // Normalize slug: remove /index for articles
            const slug = post.slug.replace(/\/index$/, "");

            return {
                title: post.data.title,
                pubDate: new Date(post.data.date),
                description: post.data.desc || post.data.description,
                link: `/article/${slug}`,
            };
        }),
        customData: `<language>zh-cn</language>`,
    });
}
