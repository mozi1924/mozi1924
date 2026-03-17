export const prerender = false;

import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
    // When using Astro API routes with Cloudflare adapter, bindings are in locals.runtime.env
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

    const url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const result = await fetch(url, {
        body: formData,
        method: 'POST',
    });

    const outcome: any = await result.json();
    if (!outcome.success) {
        return new Response(JSON.stringify({ error: "Turnstile verification failed" }), { status: 403 });
    }

    const id = crypto.randomUUID();
    const created_at = Date.now();

    try {
        await env.DB.prepare(
            'INSERT INTO comments (id, name, email, content, path, parent_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, name, email, content, path, parent_id || null, created_at).run();

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
        const { results } = await env.DB.prepare(`
            SELECT 
                c1.*,
                c2.name as parent_name,
                c2.content as parent_content
            FROM comments c1
            LEFT JOIN comments c2 ON c1.parent_id = c2.id
            WHERE c1.path = ?
            ORDER BY c1.created_at DESC
        `).bind(path).all();

        const comments = results.map((r: any) => ({
            id: r.id,
            name: r.name,
            content: r.content,
            path: r.path,
            parent_id: r.parent_id,
            created_at: r.created_at,
            parent_comment: r.parent_id ? {
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
