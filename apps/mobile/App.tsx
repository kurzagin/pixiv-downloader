import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Modal,
  Dimensions,
  SafeAreaView,
  Alert,
  Platform,
  StatusBar as RNStatusBar,
  TouchableWithoutFeedback,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { colors } from '@kurzagin/ui/tokens';
import {
  Search,
  Download,
  ExternalLink,
  Layers,
  Heart,
  Bookmark,
  Eye,
  CheckCircle,
  AlertCircle,
  Maximize2,
  X,
} from 'lucide-react-native';
import { ArtworkData } from './src/types/pixiv';
import {
  extractIllustId,
  fetchPixivArtwork,
  downloadImageToGallery,
  PIXIV_REFERER,
} from './src/services/pixiv';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function App() {
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artwork, setArtwork] = useState<ArtworkData | null>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleSearch = async () => {
    const id = extractIllustId(inputUrl);
    if (!id) {
      setError('Please enter a valid Pixiv URL or artwork ID');
      return;
    }

    setLoading(true);
    setError(null);
    setArtwork(null);

    try {
      const data = await fetchPixivArtwork(id);
      setArtwork(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch artwork from Pixiv');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSingle = async (url: string, index: number) => {
    if (!artwork) return;
    setDownloadingIndex(index);
    try {
      const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `pixiv_${artwork.id}_p${index}_${Date.now()}.${ext}`;
      const res = await downloadImageToGallery(url, fileName);
      if (res.method === 'gallery') {
        Alert.alert('Saved!', `Image p${index} saved directly to your photos gallery.`);
      }
    } catch (err: any) {
      Alert.alert('Download Error', err.message || 'Failed to save image.');
    } finally {
      setDownloadingIndex(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!artwork || !artwork.pages.length) return;
    setDownloadingAll(true);
    let successCount = 0;
    try {
      for (let i = 0; i < artwork.pages.length; i++) {
        const page = artwork.pages[i];
        const url = page.urls.original || page.urls.regular;
        const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
        const fileName = `pixiv_${artwork.id}_p${i}_${Date.now()}.${ext}`;
        await downloadImageToGallery(url, fileName);
        successCount++;
      }
      Alert.alert('Complete!', `Successfully processed ${successCount} artworks.`);
    } catch (err: any) {
      Alert.alert('Error', `Processed ${successCount} artworks before error: ${err.message}`);
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Branding */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <View style={styles.dot} />
            <Text style={styles.badgeText}>STANDALONE // ZERO BACKEND</Text>
          </View>
          <Text style={styles.title}>PIXIV EXTRACTOR</Text>
          <Text style={styles.subtitle}>Direct native extraction & gallery downloader</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchCard}>
          <View style={styles.inputRow}>
            <Search color={colors.accent} size={18} style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              placeholder="Pixiv URL or Illust ID (e.g. 114751433)"
              placeholderTextColor={colors.text3}
              value={inputUrl}
              onChangeText={setInputUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.bg0} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>EXTRACT ARTWORK</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Error Alert */}
        {error && (
          <View style={styles.errorBox}>
            <AlertCircle color={colors.danger} size={18} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Artwork Info & Media */}
        {artwork && (
          <View style={styles.artworkContainer}>
            {/* Metadata Card */}
            <View style={styles.metaCard}>
              <Text style={styles.artTitle}>{artwork.title}</Text>
              <Text style={styles.artistName}>by {artwork.userName} (@{artwork.userAccount})</Text>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Heart color={colors.redSoft} size={14} />
                  <Text style={styles.statText}>{artwork.likeCount.toLocaleString()}</Text>
                </View>
                <View style={styles.statItem}>
                  <Bookmark color={colors.accent} size={14} />
                  <Text style={styles.statText}>{artwork.bookmarkCount.toLocaleString()}</Text>
                </View>
                <View style={styles.statItem}>
                  <Eye color={colors.teal} size={14} />
                  <Text style={styles.statText}>{artwork.viewCount.toLocaleString()}</Text>
                </View>
                <View style={styles.statItem}>
                  <Layers color={colors.text1} size={14} />
                  <Text style={styles.statText}>{artwork.pages.length} Pages</Text>
                </View>
              </View>

              {/* Batch Download Button */}
              {artwork.pages.length > 1 && (
                <TouchableOpacity
                  style={styles.batchDownloadBtn}
                  onPress={handleDownloadAll}
                  disabled={downloadingAll}
                >
                  {downloadingAll ? (
                    <ActivityIndicator color={colors.bg0} size="small" />
                  ) : (
                    <>
                      <Download color={colors.bg0} size={16} />
                      <Text style={styles.batchDownloadText}>
                        SAVE ALL {artwork.pages.length} TO GALLERY
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Artwork Pages Grid / List */}
            <View style={styles.pagesSection}>
              <Text style={styles.sectionHeader}>ARTWORK PAGES ({artwork.pages.length})</Text>
              {artwork.pages.map((page, idx) => {
                const targetUrl = page.urls.original || page.urls.regular;
                const previewImg = page.urls.regular || page.urls.small || page.urls.original;
                const isDownloadingThis = downloadingIndex === idx;

                return (
                  <View key={idx} style={styles.pageCard}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setPreviewUrl(previewImg)}
                      style={styles.imageWrapper}
                    >
                      <Image
                        source={{
                          uri: previewImg,
                          headers: {
                            Referer: PIXIV_REFERER,
                          },
                        }}
                        style={styles.pageImage}
                        contentFit="cover"
                        transition={200}
                      />
                      <View style={styles.zoomIndicator}>
                        <Maximize2 color={colors.text0} size={14} />
                      </View>
                    </TouchableOpacity>

                    <View style={styles.pageFooter}>
                      <Text style={styles.pageNumber}>
                        PAGE {idx + 1} // {page.width}x{page.height}
                      </Text>
                      <TouchableOpacity
                        style={styles.downloadSingleBtn}
                        onPress={() => handleDownloadSingle(targetUrl, idx)}
                        disabled={isDownloadingThis}
                      >
                        {isDownloadingThis ? (
                          <ActivityIndicator color={colors.accent} size="small" />
                        ) : (
                          <>
                            <Download color={colors.accent} size={14} />
                            <Text style={styles.downloadSingleText}>SAVE HI-RES</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Fullscreen Preview Modal */}
      <Modal
        visible={!!previewUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUrl(null)}
      >
        <TouchableWithoutFeedback onPress={() => setPreviewUrl(null)}>
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setPreviewUrl(null)}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <X color={colors.text} size={24} />
            </TouchableOpacity>
            {previewUrl && (
              <TouchableWithoutFeedback onPress={() => setPreviewUrl(null)}>
                <Image
                  source={{
                    uri: previewUrl,
                    headers: {
                      Referer: PIXIV_REFERER,
                    },
                  }}
                  style={styles.fullscreenImage}
                  contentFit="contain"
                />
              </TouchableWithoutFeedback>
            )}
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg0,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 8 : 0,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '600',
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text0,
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 12,
    color: colors.text2,
    marginTop: 4,
  },
  searchCard: {
    backgroundColor: colors.bg1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 44,
    color: colors.text0,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    height: 44,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.bg0,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg2,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    flex: 1,
  },
  artworkContainer: {
    marginTop: 8,
  },
  metaCard: {
    backgroundColor: colors.bg1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  artTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text0,
    marginBottom: 4,
  },
  artistName: {
    fontSize: 13,
    color: colors.accent,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: colors.text1,
    fontSize: 12,
  },
  batchDownloadBtn: {
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  batchDownloadText: {
    color: colors.bg0,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  pagesSection: {
    marginTop: 8,
  },
  sectionHeader: {
    fontSize: 12,
    color: colors.text2,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 10,
  },
  pageCard: {
    backgroundColor: colors.bg1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 14,
  },
  imageWrapper: {
    width: '100%',
    height: 320,
    position: 'relative',
    backgroundColor: colors.bg2,
  },
  pageImage: {
    width: '100%',
    height: '100%',
  },
  zoomIndicator: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 4,
  },
  pageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  pageNumber: {
    fontSize: 11,
    color: colors.text2,
    fontWeight: '600',
  },
  downloadSingleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    gap: 4,
  },
  downloadSingleText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: '80%',
  },
});
