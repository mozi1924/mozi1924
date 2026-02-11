
import { getCollection } from 'astro:content';

export async function GET(context) {
    const blogPosts = await getCollection('blog');
    const articles = await getCollection('article');

    const posts = [
        ...blogPosts.map((post) => ({
            title: post.data.title,
            description: post.data.desc || post.data.description || "",
            url: `/blogs/${post.slug.replace(/\/index$/, "")}`,
            type: 'blog',
            content: post.body,
        })),
        ...articles.map((post) => ({
            title: post.data.title,
            description: post.data.desc || post.data.description || "",
            url: `/article/${post.slug.replace(/\/index$/, "")}`,
            type: 'article',
            content: post.body,
        }))
    ];

    const staticPages = [
        {
            title: "Home",
            description: "Mozi's personal website featuring Blender 3D animations, Minecraft rigs, and plugins.",
            url: "/",
            type: 'page',
            content: "",
        },
        {
            title: "About",
            description: "Learn more about Mozi1924.",
            url: "/about",
            type: 'page',
            content: "",
        },
        {
            title: "Mozi's Rig",
            description: "Check out Mozi's Minecraft rigs.",
            url: "/mozi-rig",
            type: 'page',
            content: "",
        },
    ];

    return new Response(JSON.stringify([...staticPages, ...posts]), {
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

