export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
    const env = (locals as any).runtime.env;
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

    try {
        await env.DB.prepare(
            'INSERT INTO comments (id, name, email, content, path, parent_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, name, email, content, path, parent_id || null, created_at).run();

        // Send email notification (fire-and-forget, don't block response)
        if (env.EMAIL_API_KEY && env.NOTIFY_TO && env.NOTIFY_FROM) {
            const siteUrl = 'https://mozi1924.com';
            const postUrl = `${siteUrl}${path}#comment-${id}`;
            const subject = parent_id
                ? `New reply on ${path}`
                : `New comment on ${path}`;
            const html = `<p><strong>${name}</strong> commented on <a href="${postUrl}">${path}</a>:</p><blockquote>${content.replace(/\n/g, '<br>')}</blockquote><p><a href="${postUrl}">View comment</a></p>`;

            fetch('https://vercel-email-routing.vercel.app/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': env.EMAIL_API_KEY },
                body: JSON.stringify({ to: env.NOTIFY_TO, from: env.NOTIFY_FROM, subject, html }),
            }).catch(() => { /* ignore notification errors */ });
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
                c1.id, c1.name, c1.email, c1.content, c1.path, c1.parent_id, c1.created_at,
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
