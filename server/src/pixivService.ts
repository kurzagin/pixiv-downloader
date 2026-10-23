import { request } from 'undici';

const PIXIV_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://www.pixiv.net/',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
};

export interface PixivPage {
  urls: {
    thumb_mini: string;
    small: string;
    regular: string;
    original: string;
  };
  width: number;
  height: number;
}

export async function fetchPixivArtwork(illustId: string) {
  // First attempt: Standard desktop AJAX endpoint
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

  // 2. Check if desktop returned valid URLs or null (happens on R-18 or age-gated works)
  const desktopHasValidUrls = 
    pages.length > 0 && pages[0]?.urls && (pages[0].urls.regular || pages[0].urls.original);

  // 3. If desktop hid URLs (or pages is empty / null URLs), use Pixiv's mobile touch endpoint!
  // Pixiv's mobile touch endpoint exposes ALL images & originals for R-18 works even without login!
  if (!desktopHasValidUrls) {
    try {
      const touchUrl = `https://www.pixiv.net/touch/ajax/illust/details?illust_id=${illustId}`;
      const touchRes = await request(touchUrl, {
        method: 'GET',
        headers: PIXIV_HEADERS,
      });

      if (touchRes.statusCode === 200) {
        const touchJson: any = await touchRes.body.json();
        const details = touchJson?.body?.illust_details;

        if (details) {
          // If multi-page manga_a exists
          if (Array.isArray(details.manga_a) && details.manga_a.length > 0) {
            pages = details.manga_a.map((m: any, idx: number) => {
              const imgDim = details.illust_images?.[idx] || {};
              return {
                urls: {
                  thumb_mini: m.url_small || m.url,
                  small: m.url_small || m.url,
                  regular: m.url,
                  original: m.url_big || m.url,
                },
                width: parseInt(imgDim.illust_image_width, 10) || body.width || 0,
                height: parseInt(imgDim.illust_image_height, 10) || body.height || 0,
              };
            });
          } else if (details.url_big || details.url) {
            // Single page from touch details
            pages = [
              {
                urls: {
                  thumb_mini: details.url_small || details.url,
                  small: details.url_small || details.url,
                  regular: details.url,
                  original: details.url_big || details.url,
                },
                width: body.width || 0,
                height: body.height || 0,
              },
            ];
          }
        }
      }
    } catch (touchErr) {
      console.warn(`Touch endpoint fallback failed for ${illustId}:`, touchErr);
    }
  }

  // 4. Final fallback to desktop body.urls if pages is still empty
  if (pages.length === 0 && body.urls && (body.urls.regular || body.urls.original)) {
    pages = [
      {
        urls: body.urls,
        width: body.width,
        height: body.height,
      },
    ];
  }

  const tags = (body.tags?.tags || []).map((t: any) => ({
    name: t.tag,
    translation: t.translation?.en || undefined,
  }));

  return {
    id: body.illustId || illustId,
    title: body.illustTitle || body.title || 'Untitled',
    description: body.illustComment || body.description || '',
    authorId: body.userId,
    authorName: body.userName,
    authorAccount: body.userAccount,
    authorAvatar: body.userAvatar || undefined,
    createDate: body.createDate,
    uploadDate: body.uploadDate,
    tags,
    illustType: body.illustType ?? 0,
    pageCount: pages.length || (body.pageCount ?? 1),
    width: body.width,
    height: body.height,
    pages: pages.map((p) => ({
      thumbMini: p.urls.thumb_mini,
      small: p.urls.small,
      regular: p.urls.regular,
      original: p.urls.original,
      width: p.width,
      height: p.height,
    })),
    likeCount: body.likeCount,
    bookmarkCount: body.bookmarkCount,
    viewCount: body.viewCount,
  };
}

export async function fetchPixivImageStream(imageUrl: string) {
  // Validate that url is on pximg.net to prevent open-relay SSRF
  const parsed = new URL(imageUrl);
  if (!parsed.hostname.endsWith('pximg.net')) {
    throw new Error('Invalid image host. Only i.pximg.net is allowed.');
  }

  const response = await request(imageUrl, {
    method: 'GET',
    headers: {
      'User-Agent': PIXIV_HEADERS['User-Agent'],
      'Referer': 'https://www.pixiv.net/',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  });

  if (response.statusCode !== 200) {
    throw new Error(`Failed to fetch image: HTTP ${response.statusCode}`);
  }

  return {
    body: response.body,
    contentType: response.headers['content-type'] || 'image/jpeg',
    contentLength: response.headers['content-length'],
  };
}
