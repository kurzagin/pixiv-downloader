import * as FileSystem from 'expo-file-system/legacy';
import { Directory } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
export const PIXIV_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: PIXIV_REFERER,
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
};

/**
 * Direct fetch without backend proxy using pixivjs
 */
export async function fetchPixivArtwork(illustId: string | number): Promise<ArtworkData> {
  return pixivClient.getArtwork(illustId);
}

const SAF_DIR_KEY = '@pixiv_saf_downloads_dir';

/**
 * Get or prompt user for Downloads directory access on Android
 */
export async function getOrSelectDownloadsDirectory(): Promise<string | null> {
  if (Platform.OS !== 'android') return null;

  try {
    const savedUri = await AsyncStorage.getItem(SAF_DIR_KEY);
    if (savedUri) {
      return savedUri;
    }

    // Try modern Directory.pickDirectoryAsync first (Expo 58+)
    if (typeof Directory?.pickDirectoryAsync === 'function') {
      try {
        const pickedDir = await Directory.pickDirectoryAsync();
        if (pickedDir && pickedDir.uri) {
          await AsyncStorage.setItem(SAF_DIR_KEY, pickedDir.uri);
          return pickedDir.uri;
        }
      } catch (pickErr: any) {
        console.warn('Directory.pickDirectoryAsync failed or was cancelled:', pickErr);
      }
    }

    // Fallback to legacy StorageAccessFramework
    const { StorageAccessFramework } = FileSystem;
    if (StorageAccessFramework) {
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions && permissions.granted) {
        await AsyncStorage.setItem(SAF_DIR_KEY, permissions.directoryUri);
        return permissions.directoryUri;
      }
    }
  } catch (err: any) {
    console.warn('Storage directory permission error:', err?.message || err);
  }

  return null;
}

/**
 * Reset selected downloads directory
 */
export async function resetDownloadsDirectory(): Promise<void> {
  await AsyncStorage.removeItem(SAF_DIR_KEY);
}

// In-memory cache for preview images (url -> local fileUri)
const previewCache = new Map<string, string>();
const previewPromises = new Map<string, Promise<string>>();

/**
 * Fetch and cache a preview image locally with Pixiv Referer header so Image components
 * can load it seamlessly without 403 blocks.
 */
export async function getCachedPreviewUri(url: string): Promise<string> {
  if (previewCache.has(url)) {
    return previewCache.get(url)!;
  }
  if (previewPromises.has(url)) {
    return previewPromises.get(url)!;
  }

  const promise = (async () => {
    try {
      const filename = `preview_${encodeURIComponent(url).slice(-40).replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
      const localUri = `${FileSystem.cacheDirectory || ''}${filename}`;

      // Check if already on disk
      const info = await FileSystem.getInfoAsync(localUri);
      if (info.exists) {
        previewCache.set(url, localUri);
        return localUri;
      }

      const res = await FileSystem.downloadAsync(url, localUri, {
        headers: {
          Referer: PIXIV_REFERER,
          'User-Agent': PIXIV_HEADERS['User-Agent'],
        },
      });

      if (res.status === 200) {
        previewCache.set(url, res.uri);
        return res.uri;
      }
      return url; // fallback
    } catch (err) {
      console.warn('Failed to cache preview image:', err);
      return url; // fallback to original url
    } finally {
      previewPromises.delete(url);
    }
  })();

  previewPromises.set(url, promise);
  return promise;
}

export type DownloadProgressCallback = (progress: {
  loaded: number;
  total: number;
  percent: number;
}) => void;

/**
 * Direct file download with live progress tracking and saving to /Downloads (Android SAF)
 * or Photos Gallery via MediaLibrary.
 */
export async function downloadImageToGallery(
  imageUrl: string,
  fileName: string,
  onProgress?: DownloadProgressCallback
): Promise<{ uri: string; method: 'downloads' | 'gallery' | 'shared' }> {
  const localUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}${fileName}`;

  const downloadResumable = FileSystem.createDownloadResumable(
    imageUrl,
    localUri,
    {
      headers: {
        Referer: PIXIV_REFERER,
        'User-Agent': PIXIV_HEADERS['User-Agent'],
      },
    },
    (progressData) => {
      const total = progressData.totalBytesExpectedToWrite;
      const loaded = progressData.totalBytesWritten;
      const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
      if (onProgress) {
        onProgress({ loaded, total, percent });
      }
    }
  );

  const downloadResult = await downloadResumable.downloadAsync();
  if (!downloadResult || downloadResult.status !== 200) {
    throw new Error(`Failed to download image (HTTP ${downloadResult?.status || 'unknown'})`);
  }

  const isPng = fileName.endsWith('.png');
  const mimeType = isPng ? 'image/png' : 'image/jpeg';

  // 1. Primary Strategy on Android: Save directly to selected folder
  if (Platform.OS === 'android') {
    try {
      let dirUri = await getOrSelectDownloadsDirectory();
      if (dirUri) {
        const base64Data = await FileSystem.readAsStringAsync(downloadResult.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        try {
          const targetDir = new Directory(dirUri);
          const rawName = fileName.replace(/\.[^/.]+$/, '');
          const targetFile = targetDir.createFile(rawName, mimeType);
          await targetFile.write(base64Data, { encoding: 'base64' as any });
          return { uri: targetFile.uri, method: 'downloads' };
        } catch (modernWriteErr) {
          const { StorageAccessFramework } = FileSystem;
          if (StorageAccessFramework) {
            const rawName = fileName.replace(/\.[^/.]+$/, '');
            const newFileUri = await StorageAccessFramework.createFileAsync(
              dirUri,
              rawName,
              mimeType
            );
            await StorageAccessFramework.writeAsStringAsync(newFileUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            return { uri: newFileUri, method: 'downloads' };
          }
        }
      }
    } catch (safErr: any) {
      console.warn('Directory save failed, falling back:', safErr);
      await resetDownloadsDirectory();
    }
  }

  // 2. Secondary Strategy: Save directly to Photos Gallery via MediaLibrary
  try {
    const permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
    if (permission.granted || permission.status === 'granted') {
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      return { uri: asset.uri, method: 'gallery' };
    }
  } catch (mediaLibErr) {
    console.warn('MediaLibrary photo permission or createAsset failed, falling back to share sheet:', mediaLibErr);
  }

  // 3. Fallback: Native system Share sheet so user can choose destination
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(downloadResult.uri, {
      mimeType,
      dialogTitle: 'Save to Downloads or Share',
    });
    return { uri: downloadResult.uri, method: 'shared' };
  }

  throw new Error('Could not save to /Downloads and sharing is unavailable on this device.');
}
