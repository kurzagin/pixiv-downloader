import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
  Alert,
  Platform,
  StatusBar as RNStatusBar,
  TouchableWithoutFeedback,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import * as ExpoLinking from 'expo-linking';
import { colors } from '@krpkg/ui/tokens';
import { Badge, Dot, BracketCard, TechLabel, Button as CyberButton } from '@krpkg/ui/native';
import {
  Search,
  Download,
  ExternalLink,
  Layers,
  Heart,
  Bookmark,
  Eye,
  AlertCircle,
  Maximize2,
  X,
  ClipboardPaste,
  Code2,
} from 'lucide-react-native';
import { ArtworkData } from './src/types/pixiv';
import {
  extractIllustId,
  fetchPixivArtwork,
  downloadImageToGallery,
  sanitizeFilename,
  PIXIV_REFERER,
} from './src/services/pixiv';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GITHUB_REPO_URL = 'https://github.com/kurzagin/pixiv-downloader';
const KURZAGIN_URL = 'https://kurzagin.com';

export default function App() {
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artwork, setArtwork] = useState<ArtworkData | null>(null);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Deep linking: catch URL shared to the app via Android Intent/browser
  useEffect(() => {
    const handleInitialUrl = async () => {
      const initialUrl = await ExpoLinking.getInitialURL();
      if (initialUrl) {
        processIncomingUrl(initialUrl);
      }
    };

    const subscription = ExpoLinking.addEventListener('url', (event) => {
      if (event.url) {
        processIncomingUrl(event.url);
      }
    });

    handleInitialUrl();
    return () => subscription.remove();
  }, []);

  const processIncomingUrl = (sharedTextOrUrl: string) => {
    const id = extractIllustId(sharedTextOrUrl);
    if (id) {
      setInputUrl(sharedTextOrUrl);
      loadArtwork(id);
    }
  };

  const loadArtwork = async (id: string) => {
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

  const handleSearch = async () => {
    const id = extractIllustId(inputUrl);
    if (!id) {
      setError('Please enter a valid Pixiv URL, artwork ID, or shared Pixiv text');
      return;
    }
    await loadArtwork(id);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const hasString = await Clipboard.hasStringAsync();
      if (!hasString) {
        Alert.alert('Clipboard Empty', 'No text found in your clipboard.');
        return;
      }
      const text = await Clipboard.getStringAsync();
      if (!text || !text.trim()) {
        Alert.alert('Clipboard Empty', 'No text found in your clipboard.');
        return;
      }

      const id = extractIllustId(text);
      if (id) {
        setInputUrl(text);
        await loadArtwork(id);
      } else {
        setInputUrl(text);
        Alert.alert(
          'Pasted',
          'Text pasted, but no Pixiv artwork link/ID was recognized. Check input.'
        );
      }
    } catch (err: any) {
      Alert.alert('Clipboard Error', err.message || 'Could not read from clipboard.');
    }
  };

  const handleDownloadSingle = async (url: string, index: number) => {
    if (!artwork) return;
    setDownloadingIndex(index);
    try {
      const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
      const safeTitle = sanitizeFilename(artwork.title);
      const fileName = `pixiv_${artwork.id}_p${index}_${safeTitle}.${ext}`;
      const res = await downloadImageToGallery(url, fileName);
      if (res.method === 'downloads') {
        Alert.alert('Saved to /Downloads!', `Image p${index} saved directly to your Downloads folder.`);
      } else if (res.method === 'gallery') {
        Alert.alert('Saved!', `Image p${index} saved to your photos gallery.`);
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
      const safeTitle = sanitizeFilename(artwork.title);
      for (let i = 0; i < artwork.pages.length; i++) {
        const page = artwork.pages[i];
        const url = page.urls.original || page.urls.regular;
        const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
        const fileName = `pixiv_${artwork.id}_p${i}_${safeTitle}.${ext}`;
        await downloadImageToGallery(url, fileName);
        successCount++;
      }
      Alert.alert('Complete!', `Successfully processed ${successCount} artworks.`);
    } catch (err: any) {
      Alert.alert('Download Notice', `Processed ${successCount} artworks: ${err.message}`);
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
          <View style={styles.badgeRow}>
            <Badge label="STANDALONE // ZERO BACKEND" variant="accent" />
            <Dot color="accent" size={6} />
          </View>
          <Text style={styles.title}>PIXIV EXTRACTOR</Text>
          <TechLabel label="NETWORK_NODE" jp="ピクシブ抽出端末" coord="PX-MOBILE-V2" style={styles.techLabel} />
        </View>

        {/* Search & Paste Card */}
        <View style={styles.searchCard}>
          <View style={styles.inputRow}>
            <Search color={colors.accent} size={18} style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              placeholder="Pixiv URL, ID, or shared post"
              placeholderTextColor={colors.text3}
              value={inputUrl}
              onChangeText={setInputUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {inputUrl.length > 0 && (
              <TouchableOpacity
                onPress={() => setInputUrl('')}
                style={styles.clearBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X color={colors.text3} size={16} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.buttonRow}>
            <CyberButton
              variant="outline"
              size="md"
              style={styles.pasteButton}
              onPress={handlePasteFromClipboard}
              disabled={loading}
              icon={<ClipboardPaste color={colors.accent} size={15} />}
              label="PASTE"
            />

            <CyberButton
              variant="primary"
              size="md"
              style={styles.primaryButton}
              onPress={handleSearch}
              disabled={loading}
              icon={!loading ? <Search color={colors.bg0} size={15} /> : undefined}
            >
              {loading ? (
                <ActivityIndicator color={colors.bg0} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>EXTRACT ARTWORK</Text>
              )}
            </CyberButton>
          </View>
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
            {/* Metadata Card with Cyberpunk Bracket HUD */}
            <BracketCard active style={styles.metaCard}>
              <View style={styles.artBadgeRow}>
                <Badge label={`ID: ${artwork.id}`} variant="accent" />
                <Badge label={`${artwork.pages.length} PAGES`} variant="default" />
              </View>

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
                <CyberButton
                  variant="primary"
                  size="md"
                  style={styles.batchDownloadBtn}
                  onPress={handleDownloadAll}
                  disabled={downloadingAll}
                  icon={!downloadingAll ? <Download color={colors.bg0} size={16} /> : undefined}
                >
                  {downloadingAll ? (
                    <ActivityIndicator color={colors.bg0} size="small" />
                  ) : (
                    <Text style={styles.batchDownloadText}>
                      SAVE ALL {artwork.pages.length} TO GALLERY
                    </Text>
                  )}
                </CyberButton>
              )}
            </BracketCard>

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
                      <CyberButton
                        variant="outline"
                        size="sm"
                        style={styles.downloadSingleBtn}
                        onPress={() => handleDownloadSingle(targetUrl, idx)}
                        disabled={isDownloadingThis}
                        icon={!isDownloadingThis ? <Download color={colors.accent} size={13} /> : undefined}
                      >
                        {isDownloadingThis ? (
                          <ActivityIndicator color={colors.accent} size="small" />
                        ) : (
                          <Text style={styles.downloadSingleText}>SAVE HI-RES</Text>
                        )}
                      </CyberButton>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Footer: Made by kurzagin & GitHub */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.footerLink}
            onPress={() => Linking.openURL(KURZAGIN_URL)}
          >
            <Text style={styles.footerBrand}>MADE BY KURZAGIN</Text>
          </TouchableOpacity>
          <Text style={styles.footerDivider}>//</Text>
          <TouchableOpacity
            style={styles.footerGithub}
            onPress={() => Linking.openURL(GITHUB_REPO_URL)}
          >
            <Code2 color={colors.text2} size={14} />
            <Text style={styles.footerGithubText}>SOURCE ON GITHUB</Text>
          </TouchableOpacity>
        </View>
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  techLabel: {
    marginTop: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text0,
    letterSpacing: 1.5,
  },
  artBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
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
    fontSize: 13,
  },
  clearBtn: {
    padding: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 14,
    height: 44,
    gap: 6,
  },
  pasteButtonText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  primaryButton: {
    flex: 1,
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
  footer: {
    marginTop: 24,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  footerLink: {
    paddingVertical: 6,
  },
  footerBrand: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '700',
    letterSpacing: 1,
  },
  footerDivider: {
    fontSize: 11,
    color: colors.text3,
  },
  footerGithub: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
  },
  footerGithubText: {
    fontSize: 11,
    color: colors.text2,
    fontWeight: '600',
    letterSpacing: 0.5,
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
