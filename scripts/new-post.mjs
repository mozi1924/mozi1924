import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
    console.log('\x1b[36m%s\x1b[0m', '🚀 Creating a new post...');

    // 1. Choose collection
    const typeChoice = await question('Collection type (1: blog, 2: article) [1]: ') || '1';
    const collection = typeChoice === '2' ? 'article' : 'blog';

    // 2. Title
    const title = await question('Post title: ');
    if (!title) {
        console.error('Title is required!');
        process.exit(1);
    }

    // 3. Slug
    let defaultSlug = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    
    if (!defaultSlug || defaultSlug === '-') {
        defaultSlug = `post-${date}`;
    }
    const slug = await question(`Post slug [${defaultSlug}]: `) || defaultSlug;

    // 4. Description
    const desc = await question('Description (optional): ');

    // 5. Language
    const lang = await question('Language (zh/en) [zh]: ') || 'zh';

    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(rootDir, 'src/content', collection, `${slug}.mdx`);
    const assetsDir = path.join(rootDir, 'public/assets', slug);

    // Frontmatter template
    const frontmatter = `---
lang: ${lang}
title: "${title}"
date: "${date}"
desc: "${desc}"
image: "/assets/${slug}/cover.webp"
draft: true
---

# ${title}

Write your content here...
`;

    // Create directories and file
    if (fs.existsSync(filePath)) {
        const confirm = await question(`File ${slug}.mdx already exists. Overwrite? (y/n) [n]: `);
        if (confirm.toLowerCase() !== 'y') {
            process.exit(0);
        }
    }

    fs.writeFileSync(filePath, frontmatter);
    console.log(`\x1b[32m✔ Created ${filePath}\x1b[0m`);

    if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
        console.log(`\x1b[32m✔ Created assets directory: ${assetsDir}\x1b[0m`);
    }

    console.log('\n\x1b[35m%s\x1b[0m', '✨ Done! You can now start writing.');
    rl.close();
}

main().catch(console.error);
