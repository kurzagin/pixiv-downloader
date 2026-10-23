import express, { Request, Response } from 'express';
import cors from 'cors';
import archiver from 'archiver';
import { fetchPixivArtwork, fetchPixivImageStream } from './pixivService';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper to extract illust ID from full URL or bare ID
function extractIllustId(input: string): string | null {
  const trimmed = input.trim();
  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/artworks\/(\d+)/);
  if (match) {
    return match[1];
  }
  const illustMatch = trimmed.match(/illust_id=(\d+)/);
  if (illustMatch) {
    return illustMatch[1];
  }
  return null;
}

// 1. Fetch artwork metadata
app.get('/api/illust', async (req: Request, res: Response) => {
  try {
    const rawInput = (req.query.target as string) || (req.query.id as string) || '';
    const illustId = extractIllustId(rawInput);

    if (!illustId) {
      return res.status(400).json({ error: 'Invalid Pixiv artwork ID or URL.' });
    }

    const data = await fetchPixivArtwork(illustId);
    res.json(data);
  } catch (err: any) {
    console.error('Error fetching artwork:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// Backward compatibility with bare IDs in path
app.get('/api/illust/:idOrUrl(*)', async (req: Request, res: Response) => {
  try {
    const rawInput = req.params.idOrUrl;
    const illustId = extractIllustId(rawInput);

    if (!illustId) {
      return res.status(400).json({ error: 'Invalid Pixiv artwork ID or URL.' });
    }

    const data = await fetchPixivArtwork(illustId);
    res.json(data);
  } catch (err: any) {
    console.error('Error fetching artwork:', err.message);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 2. Proxy image with Referer for browser rendering (preview)
app.get('/api/proxy', async (req: Request, res: Response) => {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Missing "url" query parameter' });
    }

    const { body, contentType, contentLength } = await fetchPixivImageStream(imageUrl);

    res.setHeader('Content-Type', contentType as string);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength as string);
    }
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache previews for 24h

    // Pipe undici ReadableStream to express response
    body.pipe(res);
  } catch (err: any) {
    console.error('Proxy error:', err.message);
    res.status(502).json({ error: err.message || 'Failed to stream image' });
  }
});

// 3. Single image direct download trigger with custom filename
app.get('/api/download/single', async (req: Request, res: Response) => {
  try {
    const imageUrl = req.query.url as string;
    const filename = (req.query.filename as string) || 'pixiv_download.jpg';

    if (!imageUrl) {
      return res.status(400).json({ error: 'Missing "url" query parameter' });
    }

    const { body, contentType } = await fetchPixivImageStream(imageUrl);

    // Sanitize filename for content-disposition
    const safeFilename = encodeURIComponent(filename);

    res.setHeader('Content-Type', contentType as string);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`
    );

    body.pipe(res);
  } catch (err: any) {
    console.error('Download error:', err.message);
    res.status(502).json({ error: err.message || 'Download failed' });
  }
});

// 4. Batch download all pages as a ZIP archive
app.get('/api/download/zip/:id', async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const illustId = extractIllustId(rawId);

    if (!illustId) {
      return res.status(400).json({ error: 'Invalid artwork ID' });
    }

    const data = await fetchPixivArtwork(illustId);
    if (!data.pages || data.pages.length === 0) {
      return res.status(404).json({ error: 'No images found for this artwork' });
    }

    const cleanTitle = data.title.replace(/[\\/:*?"<>|]/g, '_');
    const cleanAuthor = data.authorName.replace(/[\\/:*?"<>|]/g, '_');
    const zipName = `[${cleanAuthor}] ${cleanTitle} (${data.id}).zip`;
    const safeZipName = encodeURIComponent(zipName);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeZipName}"; filename*=UTF-8''${safeZipName}`
    );

    const archive = archiver('zip', {
      zlib: { level: 0 }, // Store only (no re-compression needed on JPEG/PNG) for maximum speed
    });

    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).send({ error: err.message });
      }
    });

    archive.pipe(res);

    // Fetch and append all pages in order
    for (let i = 0; i < data.pages.length; i++) {
      const page = data.pages[i];
      const ext = page.original.split('.').pop() || 'jpg';
      const fileEntryName = `${data.id}_p${i}.${ext}`;

      try {
        const stream = await fetchPixivImageStream(page.original);
        archive.append(stream.body as any, { name: fileEntryName });
      } catch (err) {
        console.error(`Failed to fetch page ${i} for zip:`, err);
      }
    }

    await archive.finalize();
  } catch (err: any) {
    console.error('ZIP download error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Failed to generate ZIP' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Pixiv Downloader backend running at http://localhost:${PORT}`);
});
