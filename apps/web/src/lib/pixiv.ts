import { PixivClient, extractIllustId, isPixivCdnUrl } from 'pixivjs';
import { request } from 'undici';

export { extractIllustId, isPixivCdnUrl };
export type { PixivPage, ArtworkData } from 'pixivjs';

export const pixivClient = new PixivClient();

export const PIXIV_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: 'https://www.pixiv.net/',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
};

export async function fetchPixivArtwork(illustId: string) {
  return pixivClient.getArtwork(illustId);
}

/**
 * Fetch image as a stream using undici for Next.js API streaming routes
 */
export async function fetchPixivImageStream(imageUrl: string) {
  if (!isPixivCdnUrl(imageUrl)) {
    throw new Error('Invalid or untrusted image URL domain');
  }

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
