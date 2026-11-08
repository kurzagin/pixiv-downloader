import {
  PixivClient,
  extractIllustId,
  isPixivCdnUrl,
  sanitizeFilename,
  PixivError,
  PixivValidationError,
  PixivNotFoundError,
  PixivRateLimitError,
  PixivAuthError,
  PixivApiError,
  PixivDownloadError,
} from '@krpkg/pixivjs';
import type {
  PixivPage,
  PixivPageUrls,
  PixivTag,
  ArtworkData,
  DownloadProgress,
  DownloadZipOptions,
  UgoiraMeta,
} from '@krpkg/pixivjs';

export {
  extractIllustId,
  isPixivCdnUrl,
  sanitizeFilename,
  PixivError,
  PixivValidationError,
  PixivNotFoundError,
  PixivRateLimitError,
  PixivAuthError,
  PixivApiError,
  PixivDownloadError,
};

export type {
  PixivPage,
  PixivPageUrls,
  PixivTag,
  ArtworkData,
  DownloadProgress,
  DownloadZipOptions,
  UgoiraMeta,
};

export const pixivClient = new PixivClient({
  retries: 2,
  retryDelay: 800,
});

export const PIXIV_REFERER = 'https://www.pixiv.net/';

export async function fetchPixivArtwork(illustId: string | number) {
  return pixivClient.getArtwork(illustId);
}

export async function fetchPixivImage(imageUrl: string, signal?: AbortSignal) {
  return pixivClient.fetchImage(imageUrl, signal);
}

export async function downloadArtworkZip(
  artwork: ArtworkData,
  options?: DownloadZipOptions
) {
  return pixivClient.downloadZip(artwork, options);
}
