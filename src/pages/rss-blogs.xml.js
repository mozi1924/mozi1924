import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../config';
import { getEntrySlug } from '../utils/article';

export async function GET(context) {
    const blogs = await getCollection('blog');

    // Sort
    const sortedBlogs = blogs.sort((a, b) =>
        new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
    );

    return rss({
        title: `${SITE.title} - Blogs`,
        description: "Blog posts from Mozi1924",
        site: context.site,
        items: sortedBlogs.map((post) => {
            return {
                title: post.data.title,
                pubDate: new Date(post.data.date),
                description: post.data.desc || post.data.description,
                link: `/blogs/${getEntrySlug(post)}/`,
            };
        }),
        customData: `<language>zh-cn</language>`,
    });
}
