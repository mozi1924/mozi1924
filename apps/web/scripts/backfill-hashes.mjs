import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';

const DB_NAME = "mozi1924-com";

// 1. Fetch comments without hashes
console.log("Fetching comments without hashes...");
const result = spawnSync('npx', ['wrangler', 'd1', 'execute', DB_NAME, '--remote', '--command=SELECT id, email FROM comments WHERE email_hash IS NULL', '--json'], { encoding: 'utf8' });

if (result.status !== 0) {
    console.error("Failed to fetch data:", result.stderr);
    process.exit(1);
}

let data;
try {
    data = JSON.parse(result.stdout);
} catch (e) {
    console.error("Failed to parse output:", result.stdout);
    process.exit(1);
}

const rows = data[0]?.results || [];
console.log(`Found ${rows.length} rows to update.`);

// 2. Update in batches
if (rows.length > 0) {
    console.log("Generating and applying updates...");
    
    // Group updates into smaller chunks if there are many, but for now we'll do one batch
    let sql = "";
    for (const row of rows) {
        if (!row.email) continue;
        const hash = crypto.createHash('md5').update(row.email.trim().toLowerCase()).digest('hex');
        sql += `UPDATE comments SET email_hash = '${hash}' WHERE id = '${row.id}'; `;
    }
    
    if (sql) {
        const updateResult = spawnSync('npx', ['wrangler', 'd1', 'execute', DB_NAME, '--remote', `--command=${sql}`], { encoding: 'utf8' });
        
        if (updateResult.status === 0) {
            console.log("Successfully backfilled all hashes!");
        } else {
            console.error("Update failed:", updateResult.stderr);
        }
    }
} else {
    console.log("No rows need backfilling.");
}
