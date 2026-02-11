export interface NavLink {
    name: string;
    href: string;
}

export interface FooterLink {
    name: string;
    href: string;
}

export const NAV_LINKS: NavLink[] = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Blogs", href: "/blogs" },
    { name: "Articles", href: "/article" },
    { name: "Mozi's Rig", href: "/mozi-rig" },
    { name: "Text2Arch Tool", href: "/text-to-archbase4-encryption-decryption" },
];

export const FOOTER_LINKS: FooterLink[] = [
    { name: "GitHub", href: "https://github.com/mozi1924" },
    { name: "Mozi Store", href: "https://store.mozi1924.com/" },
    { name: "YouTube", href: "https://www.youtube.com/@moziarasaka" },
    { name: "Bilibili", href: "https://space.bilibili.com/434156493" },
    { name: "RSS", href: "/rss.xml" },
];
