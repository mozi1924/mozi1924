export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals }) => {
    const env = (locals as any).runtime.env;
    const url = new URL(request.url);
    const commentId = url.searchParams.get('id');

    if (!commentId) {
        return new Response(null, { status: 400 });
    }

    // Look up email by comment id (never expose email to client)
    let email: string | null = null;
    try {
        const row: any = await env.DB.prepare(
            'SELECT email FROM comments WHERE id = ? LIMIT 1'
        ).bind(commentId).first();
        email = row?.email ?? null;
    } catch {
        // fall through to default
    }

    if (!email) {
        return Response.redirect('/assets/default.webp', 302);
    }

    // Compute MD5 hash of lowercased trimmed email
    const normalized = email.trim().toLowerCase();
    const msgBuffer = new TextEncoder().encode(normalized);
    const hashBuffer = await crypto.subtle.digest('MD5', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // rating=g (all-ages only), d=404 so we can fall back to default
    const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?s=80&r=g&d=404`;

    try {
        const resp = await fetch(gravatarUrl, {
            headers: { 'User-Agent': 'mozi1924.com-avatar-proxy/1.0' },
            // 5s timeout via signal
            signal: AbortSignal.timeout(5000),
        });

        if (!resp.ok) {
            return Response.redirect('/assets/default.webp', 302);
        }

        const contentType = resp.headers.get('content-type') || 'image/jpeg';
        const body = await resp.arrayBuffer();

        return new Response(body, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch {
        return Response.redirect('/assets/default.webp', 302);
    }
};
