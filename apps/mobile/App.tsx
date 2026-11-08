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
  CheckCircle2,
  Info,
} from 'lucide-react-native';
import { ArtworkData } from './src/types/pixiv';
import {
  extractIllustId,
  fetchPixivArtwork,
  downloadImageToGallery,
  sanitizeFilename,
  getCachedPreviewUri,
  PIXIV_REFERER,
} from './src/services/pixiv';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const GITHUB_REPO_URL = 'https://github.com/kurzagin/pixiv-downloader';
const KURZAGIN_URL = 'https://kurzagin.com';

interface DialogConfig {
  visible: boolean;
  title: string;
  message: string;
  variant?: 'info' | 'success' | 'danger';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

// Custom preview item component to auto-cache Pixiv image for preview
function ArtworkPreviewImage({
  previewUrl,
  style,
  contentFit = 'cover',
}: {
  previewUrl: string;
  style: any;
  contentFit?: 'cover' | 'contain';
}) {
  const [resolvedUri, setResolvedUri] = useState<string>(previewUrl);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setImageLoading(true);

    getCachedPreviewUri(previewUrl)
      .then((uri) => {
        if (isMounted) {
          setResolvedUri(uri);
        }
      })
      .catch(() => {
        if (isMounted) {
          setResolvedUri(previewUrl);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [previewUrl]);

  return (
    <View style={[style, styles.previewContainer]}>
      <Image
        source={{
          uri: resolvedUri,
          headers: {
            Referer: PIXIV_REFERER,
          },
        }}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        transition={250}
        onLoadEnd={() => setImageLoading(false)}
      />
      {imageLoading && (
        <View style={styles.imageLoaderOverlay}>
          <ActivityIndicator color={colors.accent} size="small" />
        </View>
      )}
    </View>
  );
}

export default function App() {
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artwork, setArtwork] = useState<ArtworkData | null>(null);

  // Single download progress tracking: { [index]: percent }
  const [singleProgress, setSingleProgress] = useState<{ [key: number]: number }>({});
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  // Batch download progress tracking
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [batchProgress, setBatchProgress] = useState({
    current: 0,
    total: 0,
    currentPercent: 0,
  });

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // In-app Styled Dialog Modal
  const [dialog, setDialog] = useState<DialogConfig>({
    visible: false,
    title: '',
    message: '',
    variant: 'info',
  });

  const showAppDialog = (config: Omit<DialogConfig, 'visible'>) => {
    setDialog({ ...config, visible: true });
  };

  const closeDialog = () => {
    setDialog((prev) => ({ ...prev, visible: false }));
  };

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
        showAppDialog({
          title: 'CLIPBOARD EMPTY',
          message: 'No text found in your clipboard buffer.',
          variant: 'info',
        });
        return;
      }
      const text = await Clipboard.getStringAsync();
      if (!text || !text.trim()) {
        showAppDialog({
          title: 'CLIPBOARD EMPTY',
          message: 'Clipboard content is blank.',
          variant: 'info',
        });
        return;
      }

      const id = extractIllustId(text);
      if (id) {
        setInputUrl(text);
        await loadArtwork(id);
      } else {
        setInputUrl(text);
        showAppDialog({
          title: 'PARSING NOTICE',
          message: 'Text pasted, but no Pixiv artwork ID was recognized. Please check the URL.',
          variant: 'info',
        });
      }
    } catch (err: any) {
      showAppDialog({
        title: 'CLIPBOARD ERROR',
        message: err.message || 'Could not read from clipboard.',
        variant: 'danger',
      });
    }
  };

  const confirmDownloadSingle = (url: string, index: number) => {
    showAppDialog({
      title: 'DOWNLOAD CONFIRMATION',
      message: `Download high-resolution image for Page ${index + 1}?`,
      variant: 'info',
      confirmLabel: 'DOWNLOAD',
      cancelLabel: 'CANCEL',
      onConfirm: () => {
        closeDialog();
        startDownloadSingle(url, index);
      },
    });
  };

  const startDownloadSingle = async (url: string, index: number) => {
    if (!artwork) return;
    setDownloadingIndex(index);
    setSingleProgress((prev) => ({ ...prev, [index]: 0 }));

    try {
      const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
      const safeTitle = sanitizeFilename(artwork.title);
      const fileName = `pixiv_${artwork.id}_p${index}_${safeTitle}.${ext}`;

      const res = await downloadImageToGallery(url, fileName, (progress) => {
        setSingleProgress((prev) => ({ ...prev, [index]: progress.percent }));
      });

      showAppDialog({
        title: 'SAVED SUCCESSFULLY',
        message:
          res.method === 'downloads'
            ? `Page ${index + 1} saved directly to your Downloads folder.`
            : `Page ${index + 1} saved to your Photos Gallery.`,
        variant: 'success',
      });
    } catch (err: any) {
      showAppDialog({
        title: 'DOWNLOAD ERROR',
        message: err.message || 'Failed to download and save image.',
        variant: 'danger',
      });
    } finally {
      setDownloadingIndex(null);
    }
  };

  const confirmDownloadAll = () => {
    if (!artwork || !artwork.pages.length) return;
    showAppDialog({
      title: 'BATCH DOWNLOAD CONFIRMATION',
      message: `Download all ${artwork.pages.length} images for "${artwork.title}"?`,
      variant: 'info',
      confirmLabel: 'START BATCH',
      cancelLabel: 'CANCEL',
      onConfirm: () => {
        closeDialog();
        startDownloadAll();
      },
    });
  };

  const startDownloadAll = async () => {
    if (!artwork || !artwork.pages.length) return;
    setDownloadingAll(true);
    setBatchProgress({
      current: 0,
      total: artwork.pages.length,
      currentPercent: 0,
    });

    let successCount = 0;
    const safeTitle = sanitizeFilename(artwork.title);

    try {
      for (let i = 0; i < artwork.pages.length; i++) {
        setBatchProgress((prev) => ({ ...prev, current: i + 1, currentPercent: 0 }));
        const page = artwork.pages[i];
        const url = page.urls.original || page.urls.regular;
        const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
        const fileName = `pixiv_${artwork.id}_p${i}_${safeTitle}.${ext}`;

        await downloadImageToGallery(url, fileName, (progress) => {
          setBatchProgress((prev) => ({ ...prev, currentPercent: progress.percent }));
        });
        successCount++;
      }

      showAppDialog({
        title: 'BATCH COMPLETE',
        message: `Successfully processed and saved all ${successCount} artworks.`,
        variant: 'success',
      });
    } catch (err: any) {
      showAppDialog({
        title: 'BATCH NOTICE',
        message: `Saved ${successCount} of ${artwork.pages.length} images. ${err.message}`,
        variant: 'danger',
      });
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
            <Badge label="STANDALONE // DIRECT ENGINE" variant="accent" />
            <Dot color="accent" size={6} />
          </View>
          <Text style={styles.title}>PIXIV DOWNLOADER</Text>
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

              {/* Batch Download Progress HUD */}
              {downloadingAll && (
                <View style={styles.batchProgressContainer}>
                  <View style={styles.progressHeaderRow}>
                    <Text style={styles.progressTitle}>
                      DOWNLOADING PAGE {batchProgress.current} OF {batchProgress.total}
                    </Text>
                    <Text style={styles.progressPercentText}>{batchProgress.currentPercent}%</Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${batchProgress.currentPercent}%` },
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* Batch Download Button */}
              {artwork.pages.length > 1 && !downloadingAll && (
                <CyberButton
                  variant="primary"
                  size="md"
                  style={styles.batchDownloadBtn}
                  onPress={confirmDownloadAll}
                  disabled={downloadingAll}
                  icon={<Download color={colors.bg0} size={16} />}
                >
                  <Text style={styles.batchDownloadText}>
                    SAVE ALL {artwork.pages.length} TO GALLERY
                  </Text>
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
                const progressPct = singleProgress[idx] || 0;

                return (
                  <View key={idx} style={styles.pageCard}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setPreviewUrl(previewImg)}
                      style={styles.imageWrapper}
                    >
                      <ArtworkPreviewImage
                        previewUrl={previewImg}
                        style={styles.pageImage}
                        contentFit="cover"
                      />
                      <View style={styles.zoomIndicator}>
                        <Maximize2 color={colors.text0} size={14} />
                      </View>
                    </TouchableOpacity>

                    {/* Single Download Progress Bar */}
                    {isDownloadingThis && (
                      <View style={styles.singleProgressContainer}>
                        <View style={styles.progressHeaderRow}>
                          <Text style={styles.progressTitle}>DOWNLOADING HI-RES...</Text>
                          <Text style={styles.progressPercentText}>{progressPct}%</Text>
                        </View>
                        <View style={styles.progressBarTrack}>
                          <View
                            style={[
                              styles.progressBarFill,
                              { width: `${progressPct}%` },
                            ]}
                          />
                        </View>
                      </View>
                    )}

                    <View style={styles.pageFooter}>
                      <Text style={styles.pageNumber}>
                        PAGE {idx + 1} // {page.width}x{page.height}
                      </Text>
                      <CyberButton
                        variant="outline"
                        size="sm"
                        style={styles.downloadSingleBtn}
                        onPress={() => confirmDownloadSingle(targetUrl, idx)}
                        disabled={isDownloadingThis || downloadingAll}
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

      {/* Styled In-App Confirmation & Alert Dialog Modal */}
      <Modal
        visible={dialog.visible}
        transparent
        animationType="fade"
        onRequestClose={closeDialog}
      >
        <TouchableWithoutFeedback onPress={closeDialog}>
          <View style={styles.dialogBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.dialogCard}>
                <View style={styles.dialogHeader}>
                  <View style={styles.dialogTitleRow}>
                    {dialog.variant === 'danger' && <AlertCircle color={colors.danger} size={18} />}
                    {dialog.variant === 'success' && <CheckCircle2 color={colors.success} size={18} />}
                    {dialog.variant === 'info' && <Info color={colors.accent} size={18} />}
                    <Text
                      style={[
                        styles.dialogTitle,
                        dialog.variant === 'danger' && { color: colors.danger },
                        dialog.variant === 'success' && { color: colors.success },
                      ]}
                    >
                      {dialog.title}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={closeDialog} style={styles.dialogCloseBtn}>
                    <X color={colors.text2} size={16} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.dialogMessage}>{dialog.message}</Text>

                <View style={styles.dialogActionsRow}>
                  {dialog.cancelLabel && (
                    <CyberButton
                      variant="ghost"
                      size="sm"
                      style={styles.dialogCancelBtn}
                      onPress={dialog.onCancel ? dialog.onCancel : closeDialog}
                      label={dialog.cancelLabel}
                    />
                  )}
                  <CyberButton
                    variant={dialog.variant === 'danger' ? 'danger' : 'primary'}
                    size="sm"
                    style={styles.dialogConfirmBtn}
                    onPress={dialog.onConfirm ? dialog.onConfirm : closeDialog}
                    label={dialog.confirmLabel || 'OK'}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Fullscreen Preview Modal */}
      <Modal
        visible={!!previewUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUrl(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={styles.closeModalBtn}
            onPress={() => setPreviewUrl(null)}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <X color={colors.text} size={24} />
          </TouchableOpacity>
          {previewUrl && (
            <ArtworkPreviewImage
              previewUrl={previewUrl}
              style={styles.fullscreenImage}
              contentFit="contain"
            />
          )}
        </View>
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
    paddingHorizontal: 14,
    height: 44,
    gap: 6,
  },
  primaryButton: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
  batchProgressContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: colors.bg2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  singleProgressContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: colors.bg2,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressTitle: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  progressPercentText: {
    fontSize: 11,
    color: colors.text0,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: colors.bg3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
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
  previewContainer: {
    position: 'relative',
  },
  pageImage: {
    width: '100%',
    height: '100%',
  },
  imageLoaderOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomIndicator: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
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
  // Custom Cyber In-App Dialog
  dialogBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.bg1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 18,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dialogTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  dialogTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text0,
    letterSpacing: 0.5,
  },
  dialogCloseBtn: {
    padding: 6,
    marginLeft: 4,
    borderRadius: 4,
  },
  dialogMessage: {
    fontSize: 13,
    color: colors.text1,
    lineHeight: 20,
    marginBottom: 20,
  },
  dialogActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  dialogCancelBtn: {
    paddingHorizontal: 12,
  },
  dialogConfirmBtn: {
    paddingHorizontal: 16,
  },
});
