export const prerender = false;

import type { APIRoute } from 'astro';
import { SITE } from '/@/config';

export const POST: APIRoute = async ({ request, locals }) => {
    const env = (locals as any).runtime.env;
    const ctx = (locals as any).runtime.ctx;
    const body: any = await request.json();

    const { name, email, content, path, parent_id, turnstileToken } = body;

    if (!name || !email || !content || !path || !turnstileToken) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Verify Turnstile
    const formData = new FormData();
    formData.append('secret', env.TURNSTILE_SECRET_KEY);
    formData.append('response', turnstileToken);

    const outcome: any = await (await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        body: formData,
        method: 'POST',
    })).json();

    if (!outcome.success) {
        return new Response(JSON.stringify({ error: "Turnstile verification failed" }), { status: 403 });
    }

    const id = crypto.randomUUID();
    const created_at = Date.now();

    // Compute MD5 hash for avatar lookup
    const normalized = email.trim().toLowerCase();
    const msgBuffer = new TextEncoder().encode(normalized);
    const hashBuffer = await crypto.subtle.digest('MD5', msgBuffer);
    const emailHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    try {
        await env.DB.prepare(
            'INSERT INTO comments (id, name, email, email_hash, content, path, parent_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, name, email, emailHash, content, path, parent_id || null, created_at).run();

        // Send email notification via waitUntil so it survives after response is returned
        if (env.EMAIL_API_KEY && env.NOTIFY_FROM) {
            const sendNotification = async () => {
                const postUrl = `${SITE.url}${path}#comment-${id}`;

                let notifyTo: string = env.NOTIFY_TO || '';
                let subject: string;
                let html: string;

                if (parent_id) {
                    // Reply: notify the parent comment's author (if email available and different from commenter)
                    const parentRow: any = await env.DB.prepare(
                        'SELECT name, email FROM comments WHERE id = ? LIMIT 1'
                    ).bind(parent_id).first().catch(() => null);

                    if (parentRow?.email && parentRow.email !== email) {
                        notifyTo = parentRow.email;
                        subject = `${name} replied to your comment on mozi1924.com`;
                        html = `<p><strong>${name}</strong> replied to your comment on <a href="${postUrl}">${path}</a>:</p><blockquote>${content.replace(/\n/g, '<br>')}</blockquote><p><a href="${postUrl}">View reply</a></p>`;
                    } else if (env.NOTIFY_TO) {
                        // Fall back to owner notification if parent email unavailable or same person
                        notifyTo = env.NOTIFY_TO;
                        subject = `New reply on ${path}`;
                        html = `<p><strong>${name}</strong> replied on <a href="${postUrl}">${path}</a>:</p><blockquote>${content.replace(/\n/g, '<br>')}</blockquote><p><a href="${postUrl}">View reply</a></p>`;
                    } else {
                        return; // nothing to notify
                    }
                } else {
                    // New root comment: notify site owner
                    if (!env.NOTIFY_TO) return;
                    notifyTo = env.NOTIFY_TO;
                    subject = `New comment on ${path}`;
                    html = `<p><strong>${name}</strong> commented on <a href="${postUrl}">${path}</a>:</p><blockquote>${content.replace(/\n/g, '<br>')}</blockquote><p><a href="${postUrl}">View comment</a></p>`;
                }

                await fetch('https://vercel-email-routing.vercel.app/api/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-api-key': env.EMAIL_API_KEY },
                    body: JSON.stringify({ to: notifyTo, from: env.NOTIFY_FROM, subject, html }),
                });
            };

            ctx.waitUntil(sendNotification().catch(() => { }));
        }

        return new Response(JSON.stringify({ success: true, id }), { status: 201 });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};

export const GET: APIRoute = async ({ request, locals }) => {
    const env = (locals as any).runtime.env;
    const url = new URL(request.url);
    const path = url.searchParams.get('path');

    if (!path) {
        return new Response(JSON.stringify({ error: "Path is required" }), { status: 400 });
    }

    try {
        // Join to get parent info; also join grandparent to detect if parent is root
        const { results } = await env.DB.prepare(`
            SELECT 
                c1.id, c1.name, c1.email, c1.email_hash, c1.content, c1.path, c1.parent_id, c1.created_at,
                c2.name as parent_name,
                c2.content as parent_content,
                c2.parent_id as parent_parent_id
            FROM comments c1
            LEFT JOIN comments c2 ON c1.parent_id = c2.id
            WHERE c1.path = ?
            ORDER BY c1.created_at ASC
        `).bind(path).all();

        const comments = results.map((r: any) => ({
            id: r.id,
            author_name: r.name,
            author_hash: r.email_hash, // Stable hash for avatar proxy caching
            // email intentionally omitted from response
            content: r.content,
            path: r.path,
            parent_id: r.parent_id || null,
            created_at: r.created_at,
            // Only include parent_comment quote when parent is itself a reply (nested reply)
            parent_comment: (r.parent_id && r.parent_parent_id) ? {
                name: r.parent_name,
                content: r.parent_content
            } : null
        }));

        return new Response(JSON.stringify({ comments }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
