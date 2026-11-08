import { NextRequest, NextResponse } from 'next/server';
import {
  fetchPixivImage,
  isPixivCdnUrl,
  sanitizeFilename,
  PixivValidationError,
  PixivAuthError,
  PixivRateLimitError,
} from '@/lib/pixiv';

export async function GET(request: NextRequest) {
  try {
    const imageUrl = request.nextUrl.searchParams.get('url');
    const rawFilename = request.nextUrl.searchParams.get('filename') || 'pixiv_download.jpg';

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing "url" query parameter' }, { status: 400 });
    }

    if (!isPixivCdnUrl(imageUrl)) {
      return NextResponse.json({ error: 'Invalid or untrusted image URL domain' }, { status: 403 });
    }

    const filename = sanitizeFilename(rawFilename);
    const { data, contentType } = await fetchPixivImage(imageUrl, request.signal);

    const safeFilename = encodeURIComponent(filename);
    const headers = new Headers();
    headers.set('Content-Type', contentType || 'image/octet-stream');
    headers.set('Content-Length', String(data.byteLength));
    headers.set(
      'Content-Disposition',
      `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`
    );

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

    console.error('Download error:', err.message);
    return NextResponse.json(
      { error: err.message || 'Failed to download image' },
      { status: 502 }
    );
  }
}
