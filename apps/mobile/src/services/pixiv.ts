import * as FileSystem from 'expo-file-system/legacy';
import { Directory, File as ModernFile, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PixivPage, ArtworkData } from '../types/pixiv';

export const PIXIV_REFERER = 'https://www.pixiv.net/';
export const PIXIV_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Referer: PIXIV_REFERER,
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

/**
 * Direct client-side fetch without backend proxy
 */
export async function fetchPixivArtwork(illustId: string): Promise<ArtworkData> {
  const url = `https://www.pixiv.net/ajax/illust/${illustId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: PIXIV_HEADERS,
  });

  if (response.status === 404) {
    throw new Error('Artwork not found or has been deleted.');
  }

  if (!response.ok) {
    throw new Error(`Pixiv API responded with status ${response.status}`);
  }

  const json: any = await response.json();

  if (json.error) {
    throw new Error(json.message || 'Failed to fetch artwork from Pixiv');
  }

  const body = json.body;
  let pages: PixivPage[] = [];

  // 1. Try standard desktop pages endpoint
  try {
    const pagesUrl = `https://www.pixiv.net/ajax/illust/${illustId}/pages`;
    const pagesRes = await fetch(pagesUrl, {
      method: 'GET',
      headers: PIXIV_HEADERS,
    });

    if (pagesRes.ok) {
      const pagesJson: any = await pagesRes.json();
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
      const touchRes = await fetch(touchUrl, {
        method: 'GET',
        headers: PIXIV_HEADERS,
      });

      if (touchRes.ok) {
        const touchJson: any = await touchRes.json();
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

/**
 * Direct file download and save directly to /Downloads directory (Android SAF),
 * with fallback to MediaLibrary or system Share sheet.
 */
export async function downloadImageToGallery(
  imageUrl: string,
  fileName: string
): Promise<{ uri: string; method: 'downloads' | 'gallery' | 'shared' }> {
  const localUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}${fileName}`;

  const downloadResult = await FileSystem.downloadAsync(imageUrl, localUri, {
    headers: {
      Referer: PIXIV_REFERER,
      'User-Agent': PIXIV_HEADERS['User-Agent'],
    },
  });

  if (downloadResult.status !== 200) {
    throw new Error(`Failed to download image (HTTP ${downloadResult.status})`);
  }

  const isPng = fileName.endsWith('.png');
  const mimeType = isPng ? 'image/png' : 'image/jpeg';

  // 1. Primary Strategy on Android: Save directly to selected folder
  if (Platform.OS === 'android') {
    try {
      let dirUri = await getOrSelectDownloadsDirectory();
      if (dirUri) {
        // Read downloaded temp file as base64
        const base64Data = await FileSystem.readAsStringAsync(downloadResult.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Try modern File API write if supported
        try {
          const targetDir = new Directory(dirUri);
          const rawName = fileName.replace(/\.[^/.]+$/, '');
          const targetFile = targetDir.createFile(rawName, mimeType);
          await targetFile.write(base64Data, { encoding: 'base64' as any });
          return { uri: targetFile.uri, method: 'downloads' };
        } catch (modernWriteErr) {
          // Fallback to legacy SAF write
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

  // 2. Secondary Strategy: Attempt MediaLibrary
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status === 'granted') {
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      return { uri: asset.uri, method: 'gallery' };
    }
  } catch (mediaLibErr) {
    console.warn('MediaLibrary permission or createAsset failed, falling back to share sheet:', mediaLibErr);
  }

  // 3. Fallback: Native system Share sheet so user can choose "Save to Downloads/Files"
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(downloadResult.uri, {
      mimeType,
      dialogTitle: 'Save to Downloads or Share',
    });
    return { uri: downloadResult.uri, method: 'shared' };
  }

  throw new Error('Could not save to /Downloads and sharing is unavailable on this device.');
}
