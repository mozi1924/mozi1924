export const SITE = {
    domain: "mozi1924.com",
    url: "https://mozi1924.com",
};

export const COMMENT_CONFIG = {
    workerUrl: "https://serverless-comment-backend.arasaka.ltd",
    // Use environment variable or fallback to hardcoded
    turnstileSiteKey: import.meta.env.VITE_TURNSTILE_SITE_KEY || "0x4AAAAAACMtIrpVNiBgyN4Y",
};
