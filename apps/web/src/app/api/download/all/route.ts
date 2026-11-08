import { NextRequest, NextResponse } from 'next/server';
import {
  fetchPixivArtwork,
  downloadArtworkZip,
  PixivValidationError,
  PixivNotFoundError,
  PixivRateLimitError,
  PixivAuthError,
  PixivDownloadError,
} from '@/lib/pixiv';

export async function POST(request: NextRequest) {
  try {
    const { illustId } = await request.json();

    if (!illustId) {
      return NextResponse.json({ error: 'Missing "illustId"' }, { status: 400 });
    }

    const artwork = await fetchPixivArtwork(illustId);
    if (!artwork.pages || artwork.pages.length === 0) {
      return NextResponse.json({ error: 'No images found for this artwork' }, { status: 404 });
    }

    const { data, filename } = await downloadArtworkZip(artwork, {
      concurrency: 4,
      signal: request.signal,
    });

    const safeZipName = encodeURIComponent(filename);
    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set('Content-Length', String(data.byteLength));
    headers.set(
      'Content-Disposition',
      `attachment; filename="${safeZipName}"; filename*=UTF-8''${safeZipName}`
    );

    return new Response(data as unknown as BodyInit, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    if (err instanceof PixivValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof PixivNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof PixivRateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof PixivAuthError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof PixivDownloadError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }

    console.error('Batch download error:', err.message);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
