import * as FileSystem from 'expo-file-system/legacy';
import { Directory, File as ModernFile, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PixivClient, extractIllustId, isPixivCdnUrl } from 'pixivjs';
import type { PixivPage, ArtworkData } from 'pixivjs';

export { extractIllustId, isPixivCdnUrl };
export type { PixivPage, ArtworkData };

export const pixivClient = new PixivClient();

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
export async function fetchPixivArtwork(illustId: string): Promise<ArtworkData> {
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

  // 2. Secondary Strategy: Save directly to Photos Gallery via MediaLibrary (write-only / photo granular)
  try {
    // Request write-only permission with photo granular permission to prevent AUDIO check error in Expo Go
    const permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
    if (permission.granted || permission.status === 'granted') {
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
      return { uri: asset.uri, method: 'gallery' };
    }
  } catch (mediaLibErr) {
    console.warn('MediaLibrary photo permission or createAsset failed, falling back to share sheet:', mediaLibErr);
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
