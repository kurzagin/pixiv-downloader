import { NextRequest, NextResponse } from 'next/server';
import { fetchPixivImageStream, isPixivCdnUrl } from '@/lib/pixiv';
import { Readable } from 'stream';

export async function GET(request: NextRequest) {
  try {
    const imageUrl = request.nextUrl.searchParams.get('url');
    const filename = request.nextUrl.searchParams.get('filename') || 'pixiv_download.jpg';

    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing "url" query parameter' }, { status: 400 });
    }

    if (!isPixivCdnUrl(imageUrl)) {
      return NextResponse.json({ error: 'Invalid or untrusted image URL domain' }, { status: 403 });
    }

    const { body, contentType, contentLength } = await fetchPixivImageStream(imageUrl);
    const webStream = Readable.toWeb(body as any) as ReadableStream;

    const safeFilename = encodeURIComponent(filename);
    const headers = new Headers();
    headers.set('Content-Type', (contentType as string) || 'image/octet-stream');
    headers.set(
      'Content-Disposition',
      `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`
    );
    if (contentLength) {
      headers.set('Content-Length', contentLength as string);
    }

    return new Response(webStream, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('Download error:', err.message);
    return NextResponse.json(
      { error: err.message || 'Failed to download image' },
      { status: 502 }
    );
  }
}
