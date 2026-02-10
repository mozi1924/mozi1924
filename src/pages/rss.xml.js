
import rss from '@astrojs/rss';
import { SITE } from '../config';

export async function GET(context) {
    const postImportResult = import.meta.glob('./blogs/*.{md,mdx}', { eager: true });
    const posts = Object.values(postImportResult);

    return rss({
        title: "Mozi's Blog",
        description: "Mozi's personal website featuring Blender 3D animations, Minecraft rigs, and plugins.",
        site: context.site,
        items: posts.map((post) => ({
            title: post.frontmatter.title,
            pubDate: post.frontmatter.date,
            description: post.frontmatter.desc || post.frontmatter.description,
            link: post.url,
        })),
        customData: `<language>zh-cn</language>`,
    });
}
