import { NextRequest, NextResponse } from 'next/server';
import { fetchPixivImageStream } from '@/lib/pixiv';
import { Readable } from 'stream';

export async function GET(request: NextRequest) {
  try {
    const imageUrl = request.nextUrl.searchParams.get('url');
    if (!imageUrl) {
      return NextResponse.json({ error: 'Missing "url" query parameter' }, { status: 400 });
    }

    const { body, contentType, contentLength } = await fetchPixivImageStream(imageUrl);
    const webStream = Readable.toWeb(body as any) as ReadableStream;

    const headers = new Headers();
    headers.set('Content-Type', (contentType as string) || 'image/jpeg');
    if (contentLength) {
      headers.set('Content-Length', contentLength as string);
    }
    headers.set('Cache-Control', 'public, max-age=86400');

    return new Response(webStream, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('Proxy error:', err.message);
    return NextResponse.json(
      { error: err.message || 'Failed to stream image' },
      { status: 502 }
    );
  }
}
