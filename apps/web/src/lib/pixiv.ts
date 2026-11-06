import { request } from 'undici';
import { PixivPage, ArtworkData } from '@/types/pixiv';

export const PIXIV_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: 'https://www.pixiv.net/',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
};

export function extractIllustId(input: string): string | null {
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

export async function fetchPixivArtwork(illustId: string): Promise<ArtworkData> {
  const url = `https://www.pixiv.net/ajax/illust/${illustId}`;

  const response = await request(url, {
    method: 'GET',
    headers: PIXIV_HEADERS,
  });

  if (response.statusCode === 404) {
    throw new Error('Artwork not found or has been deleted.');
  }

  if (response.statusCode !== 200) {
    throw new Error(`Pixiv API responded with status ${response.statusCode}`);
  }

  const json: any = await response.body.json();

  if (json.error) {
    throw new Error(json.message || 'Failed to fetch artwork from Pixiv');
  }

  const body = json.body;
  let pages: PixivPage[] = [];

  // 1. Try standard desktop pages endpoint
  try {
    const pagesUrl = `https://www.pixiv.net/ajax/illust/${illustId}/pages`;
    const pagesRes = await request(pagesUrl, {
      method: 'GET',
      headers: PIXIV_HEADERS,
    });

    if (pagesRes.statusCode === 200) {
      const pagesJson: any = await pagesRes.body.json();
      if (!pagesJson.error && Array.isArray(pagesJson.body) && pagesJson.body.length > 0) {
        pages = pagesJson.body;
      }
    }
  } catch (err) {
    console.warn(`Could not fetch desktop pages for ${illustId}:`, err);
  }

  // 2. Check if desktop returned valid URLs or null (e.g. R-18 works)
  const desktopHasValidUrls =
    pages.length > 0 && pages[0]?.urls && (pages[0].urls.regular || pages[0].urls.original);

  if (!desktopHasValidUrls) {
    try {
      const touchUrl = `https://www.pixiv.net/touch/ajax/illust/details?illust_id=${illustId}`;
      const touchRes = await request(touchUrl, {
        method: 'GET',
        headers: PIXIV_HEADERS,
      });

      if (touchRes.statusCode === 200) {
        const touchJson: any = await touchRes.body.json();
        const touchIllust = touchJson?.body?.illust_details;

        if (touchIllust) {
          const pageCount = parseInt(touchIllust.page_count, 10) || 1;
          const origUrl =
            touchIllust.url_big ||
            touchIllust.url_original ||
            touchIllust.url_s ||
            touchIllust.url;

          if (origUrl) {
            pages = [];
            for (let i = 0; i < pageCount; i++) {
              const pageOrig = origUrl.replace(/_p\d+/, `_p${i}`);
              pages.push({
                urls: {
                  thumb_mini: pageOrig,
                  small: pageOrig,
                  regular: pageOrig,
                  original: pageOrig,
                },
                width: parseInt(touchIllust.width, 10) || 0,
                height: parseInt(touchIllust.height, 10) || 0,
              });
            }
          }
        }
      }
    } catch (touchErr) {
      console.warn(`Touch endpoint fallback failed for ${illustId}:`, touchErr);
    }
  }

  // If single-page artwork has no pages array, build from body.urls
  if (pages.length === 0 && body.urls) {
    pages.push({
      urls: {
        thumb_mini: body.urls.mini,
        small: body.urls.small,
        regular: body.urls.regular,
        original: body.urls.original,
      },
      width: body.width,
      height: body.height,
    });
  }

  return {
    id: body.id,
    title: body.title,
    description: body.description,
    illustType: body.illustType,
    createDate: body.createDate,
    uploadDate: body.uploadDate,
    pageCount: body.pageCount,
    width: body.width,
    height: body.height,
    userName: body.userName,
    userId: body.userId,
    userAccount: body.userAccount,
    tags: body.tags?.tags || [],
    likeCount: body.likeCount,
    bookmarkCount: body.bookmarkCount,
    viewCount: body.viewCount,
    urls: body.urls || {},
    pages,
  };
}

export async function fetchPixivImageStream(imageUrl: string) {
  const response = await request(imageUrl, {
    method: 'GET',
    headers: {
      'User-Agent': PIXIV_HEADERS['User-Agent'],
      Referer: 'https://www.pixiv.net/',
    },
  });

  if (response.statusCode !== 200) {
    throw new Error(`Failed to fetch image from Pixiv (Status: ${response.statusCode})`);
  }

  return {
    body: response.body,
    contentType: response.headers['content-type'] || 'image/jpeg',
    contentLength: response.headers['content-length'],
  };
}
