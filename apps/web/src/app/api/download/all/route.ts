import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { fetchPixivArtwork, fetchPixivImageStream } from '@/lib/pixiv';
import { PassThrough, Readable } from 'stream';

export async function POST(request: NextRequest) {
  try {
    const { illustId } = await request.json();

    if (!illustId) {
      return NextResponse.json({ error: 'Missing "illustId"' }, { status: 400 });
    }

    const data = await fetchPixivArtwork(illustId);
    if (!data.pages || data.pages.length === 0) {
      return NextResponse.json({ error: 'No images found for this artwork' }, { status: 404 });
    }

    const archive = archiver('zip', {
      zlib: { level: 5 },
    });

    const passThrough = new PassThrough();
    archive.pipe(passThrough);

    // Asynchronously append images to archive
    (async () => {
      try {
        for (let i = 0; i < data.pages.length; i++) {
          const page = data.pages[i];
          const url = page.urls.original;
          const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
          const filename = `${data.id}_p${i}_${data.title.replace(/[\\/:*?"<>|]/g, '_')}.${ext}`;

          try {
            const { body } = await fetchPixivImageStream(url);
            archive.append(body as any, { name: filename });
          } catch (err: any) {
            console.error(`Error appending page ${i} (${url}):`, err.message);
          }
        }
        await archive.finalize();
      } catch (archiveErr: any) {
        console.error('Archiver error:', archiveErr);
        archive.abort();
      }
    })();

    const zipFilename = `${data.id}_${data.title.replace(/[\\/:*?"<>|]/g, '_')}.zip`;
    const safeZipName = encodeURIComponent(zipFilename);

    const webStream = Readable.toWeb(passThrough) as ReadableStream;
    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set(
      'Content-Disposition',
      `attachment; filename="${safeZipName}"; filename*=UTF-8''${safeZipName}`
    );

    return new Response(webStream, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error('Batch download error:', err.message);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
