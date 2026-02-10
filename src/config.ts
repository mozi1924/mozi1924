export const SITE = {
    domain: "mozi1924.com",
    url: "https://mozi1924.com",
    title: "Mozi's website",
    description: "Mozi's personal website featuring Blender 3D animations, Minecraft rigs, and plugins.",
};

export const COMMENT_CONFIG = {
    workerUrl: "https://serverless-comment-backend.arasaka.ltd",
    // Use environment variable or fallback to hardcoded
    turnstileSiteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAACMtIrpVNiBgyN4Y",
};
