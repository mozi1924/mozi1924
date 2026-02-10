
export async function GET(context) {
    const postImportResult = import.meta.glob('./blogs/*.{md,mdx}', { eager: true });
    const posts = Object.values(postImportResult).map((post) => ({
        title: post.frontmatter.title,
        description: post.frontmatter.desc || post.frontmatter.description,
        url: post.url,
        type: 'blog',
    }));

    const staticPages = [
        {
            title: "Home",
            description: "Mozi's personal website featuring Blender 3D animations, Minecraft rigs, and plugins.",
            url: "/",
            type: 'page',
        },
        {
            title: "About",
            description: "Learn more about Mozi1924.",
            url: "/about",
            type: 'page',
        },
        {
            title: "Mozi's Rig",
            description: "Check out Mozi's Minecraft rigs.",
            url: "/mozi-rig",
            type: 'page',
        },
    ];

    return new Response(JSON.stringify([...staticPages, ...posts]), {
        headers: {
            'Content-Type': 'application/json',
        },
    });
}
