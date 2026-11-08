import { NextRequest, NextResponse } from 'next/server';
import {
  fetchPixivImage,
  isPixivCdnUrl,
  PixivValidationError,
  PixivAuthError,
  PixivRateLimitError,
} from '@/lib/pixiv';

export async function GET(request: NextRequest) {
  try {
    const imageUrl = request.nextUrl.searchParams.get('url');
    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing "url" query parameter' }, { status: 400 });
    }

    if (!isPixivCdnUrl(imageUrl)) {
      return NextResponse.json({ error: 'Invalid or untrusted image URL domain' }, { status: 403 });
    }

    const { data, contentType } = await fetchPixivImage(imageUrl, request.signal);

    const headers = new Headers();
    headers.set('Content-Type', contentType || 'image/jpeg');
    headers.set('Content-Length', String(data.byteLength));
    headers.set('Cache-Control', 'public, max-age=86400');

    return new Response(data, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    if (err instanceof PixivValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof PixivAuthError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof PixivRateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }

    console.error('Proxy error:', err.message);
    return NextResponse.json(
      { error: err.message || 'Failed to stream image' },
      { status: 502 }
    );
  }
}
