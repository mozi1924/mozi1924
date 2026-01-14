
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const BLOGS_DIR = 'src/pages/blogs';
const PUBLIC_DIR = 'public';

// ... (functions)


async function downloadImage(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        return await response.arrayBuffer();
    } catch (error) {
        console.error(`Error downloading ${url}:`, error);
        return null;
    }
}

async function processFile(filePath) {
    console.log(`Processing ${filePath}...`);
    let content = await fs.readFile(filePath, 'utf-8');
    const basename = path.basename(filePath, path.extname(filePath));
    const articleImagesDir = path.join(PUBLIC_DIR, basename);

    // Ensure directory exists
    await fs.mkdir(articleImagesDir, { recursive: true });

    // 1. Process Frontmatter Image
    const frontmatterRegex = /^(image:\s*["'])(.*?)(["'])/m;
    const fmMatch = content.match(frontmatterRegex);

    if (fmMatch) {
        const fullMatch = fmMatch[0];
        const prefix = fmMatch[1];
        const url = fmMatch[2];
        const suffix = fmMatch[3];

        if (url.startsWith('http')) {
            console.log(`Found frontmatter image: ${url}`);
            const imageBuffer = await downloadImage(url);
            if (imageBuffer) {
                const imageName = path.basename(new URL(url).pathname);
                const nameWithoutExt = path.parse(imageName).name;
                const newFileName = `${nameWithoutExt}.webp`;
                const newFilePath = path.join(articleImagesDir, newFileName);
                const publicPath = `/${basename}/${newFileName}`;

                await sharp(imageBuffer)
                    .webp({ quality: 80 })
                    .toFile(newFilePath);

                content = content.replace(fullMatch, `${prefix}${publicPath}${suffix}`);
                console.log(`Replaced frontmatter image with ${publicPath}`);
            }
        }
    }

    // 2. Process Markdown Images
    // Match ![alt](url)
    const mdImageRegex = /!\[(.*?)\]\((.*?)\)/g;
    let match;
    const replacements = [];

    // We need to loop and collect replacements first to avoid messing up indices if we were doing it differently,
    // but string replace with global regex and async is tricky. 
    // Easier approach: split by matches or use a rigorous replacement strategy.

    // Let's use a loop with regex.exec
    while ((match = mdImageRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        const alt = match[1];
        const url = match[2];

        if (url.startsWith('http')) {
            console.log(`Found markdown image: ${url}`);
            replacements.push({ fullMatch, alt, url });
        }
    }

    // Process replacements sequentially
    for (const { fullMatch, alt, url } of replacements) {
        const imageBuffer = await downloadImage(url);
        if (imageBuffer) {
            // sanitize filename
            let imageName = path.basename(new URL(url).pathname);
            // Decode URI component in case of encoded characters
            imageName = decodeURIComponent(imageName);

            const nameWithoutExt = path.parse(imageName).name;
            const newFileName = `${nameWithoutExt}.webp`;
            const newFilePath = path.join(articleImagesDir, newFileName);
            const publicPath = `/${basename}/${newFileName}`;

            try {
                await sharp(imageBuffer)
                    .webp({ quality: 80 })
                    .toFile(newFilePath);

                // Be careful with global replace if same URL appears multiple times
                // content = content.replace(fullMatch, `![${alt}](${publicPath})`);
                // Better: only replace the specific URL in that context? 
                // Actually, replacing all occurrences of that URL in markdown image syntax is probably desired.
                // But wait, fullMatch includes Alt text which might differ.

                // Let's use string replacement for the URL part specifically within the match? 
                // Or just simple replace string.
                content = content.replace(url, publicPath);
                console.log(`Saved ${newFilePath}`);
            } catch (err) {
                console.error(`Failed to convert/save ${url}:`, err);
            }
        }
    }

    await fs.writeFile(filePath, content, 'utf-8');
}

async function main() {
    const files = await fs.readdir(BLOGS_DIR);
    for (const file of files) {
        if (file.endsWith('.md') || file.endsWith('.mdx')) {
            const filePath = path.join(BLOGS_DIR, file);
            await processFile(filePath);
        }
    }
    console.log('Migration complete!');
}

main().catch(console.error);
