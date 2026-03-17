export const prerender = false;
import { getImage } from 'astro:assets';
import type { APIRoute } from 'astro';
import defaultAvatar from '../../assets/default.webp';

export const GET: APIRoute = async ({ request, locals }) => {
    const env = (locals as any).runtime.env;
    const url = new URL(request.url);
    const hash = url.searchParams.get('hash');
    const cache = (caches as any).default;

    // Helper to get optimized fallback
    const getFallbackUrl = async () => {
        const optimized = await getImage({ src: defaultAvatar, width: 80, format: 'webp' });
        return optimized.src;
    };

    if (!hash || !/^[a-f0-9]{32}$/i.test(hash)) {
        return new Response(null, { status: 400 });
    }

    // 1. Try Cache API first to avoid DB lookup and Gravatar fetch
    const cacheKey = new Request(url.toString(), request);
    let response = await cache.match(cacheKey);
    if (response) {
        return response;
    }

    // 2. Abuse prevention: only proxy avatars for users who have commented on this site.
    let email: string | null = null;
    try {
        const row: any = await env.DB.prepare(
            'SELECT email FROM comments WHERE email_hash = ? LIMIT 1'
        ).bind(hash).first();
        email = row?.email ?? null;
    } catch (e) {
        console.error(e);
    }

    if (!email) {
        return Response.redirect(await getFallbackUrl(), 302);
    }

    // 3. Fetch from Gravatar
    const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?s=80&r=g&d=404`;

    try {
        const resp = await fetch(gravatarUrl, {
            headers: { 'User-Agent': 'mozi1924.com-avatar-proxy/1.0' },
            signal: AbortSignal.timeout(5000),
        });

        if (!resp.ok) {
            return Response.redirect(await getFallbackUrl(), 302);
        }

        const contentType = resp.headers.get('content-type') || 'image/jpeg';
        const body = await resp.arrayBuffer();

        response = new Response(body, {
            headers: {
                'Content-Type': contentType,
                // Cache for 7 days in browser, 30 days in Cloudflare Edge
                'Cache-Control': 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400',
                'Vary': 'Accept',
            },
        });

        // 4. Store in Cache API before returning
        (locals as any).runtime.ctx.waitUntil(cache.put(cacheKey, response.clone()));

        return response;
    } catch {
        return Response.redirect(await getFallbackUrl(), 302);
    }
};
