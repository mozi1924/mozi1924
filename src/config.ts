export const SITE = {
    domain: "mozi1924.com",
    url: "https://mozi1924.com",
    title: "Mozi's website",
    description: "Mozi's personal website featuring Blender 3D animations, Minecraft rigs, and plugins.",
    keywords: "mozi1924, Mozi Arasaka, Blender, Animation, Minecraft, Rigging, Web Development, Arch Linux",
    favicon: "/favicon.svg",
    author: "Mozi A.",
};

export const COMMENT_CONFIG = {
    workerUrl: "https://serverless-comment-backend.arasaka.ltd",
    // Use environment variable or fallback to hardcoded
    turnstileSiteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAACMtIrpVNiBgyN4Y",
};

export interface Author {
    id: string;
    name: string;
    url: string;
    avatar: string;
    motto: string;
    socialLinks: {
        network: string;
        url: string;
    }[];
}

export const AUTHORS: Record<string, Author> = {
    mozi: {
        id: "mozi",
        name: "Mozi A.",
        url: "/about",
        avatar: "/assets/avatar.webp",
        motto: "I don't care if these bitches don't like me Cause, like, I'm pretty as fuck.",
        socialLinks: [
            { network: "GitHub", url: "https://github.com/mozi1924" },
            { network: "Twitter", url: "https://twitter.com/CyberMozi" },
            { network: "YouTube", url: "https://www.youtube.com/@moziarasaka" },
            { network: "Email", url: "mailto:mozi1924@arasaka.ltd" },
        ],
    },
};

export const DEFAULT_AUTHOR_ID = "mozi";
