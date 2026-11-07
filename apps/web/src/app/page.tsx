'use client';

import React, { useState } from 'react';
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
  Loader2,
  Maximize2,
  Archive,
  Image as ImageIcon,
} from 'lucide-react';
import {
  BracketCard,
  Button,
  Badge,
  Dot,
  CornerFrame,
  TechLabel,
  Logo,
} from '@krpkg/ui';
import { ArtworkData } from '@/types/pixiv';

export default function Home() {
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artwork, setArtwork] = useState<ArtworkData | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const handleFetch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputUrl.trim()) return;

    setLoading(true);
    setError(null);
    setArtwork(null);

    try {
      const res = await fetch(`/api/illust?target=${encodeURIComponent(inputUrl.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch artwork metadata');
      }

      setArtwork(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch artwork');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSingle = async (url: string, index: number) => {
    if (!artwork) return;
    setDownloadingIndex(index);

    const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
    const filename = `${artwork.id}_p${index}_${artwork.title.replace(/[\\/:*?"<>|]/g, '_')}.${ext}`;
    const downloadUrl = `/api/download/single?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;

    try {
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (err) {
      console.error('Download single error:', err);
    } finally {
      setTimeout(() => setDownloadingIndex(null), 1000);
    }
  };

  const handleDownloadAll = async () => {
    if (!artwork) return;
    setDownloadingAll(true);

    try {
      const res = await fetch('/api/download/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ illustId: artwork.id }),
      });

      if (!res.ok) {
        throw new Error('Failed to create ZIP archive');
      }

      const blob = await res.blob();
      const zipUrl = window.URL.createObjectURL(blob);
      const filename = `${artwork.id}_${artwork.title.replace(/[\\/:*?"<>|]/g, '_')}.zip`;

      const anchor = document.createElement('a');
      anchor.href = zipUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(zipUrl);
    } catch (err: any) {
      alert(`ZIP Download failed: ${err.message}`);
    } finally {
      setDownloadingAll(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 md:px-8 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Top Header & Branding */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[var(--kz-border,#262c36)] pb-6">
        <div className="flex items-center gap-3">
          <Logo size={36} color="var(--kz-accent,#e5a93c)" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-wider uppercase text-[var(--kz-text-primary,#e6edf3)]">
                PIXIV // EXTRACTOR
              </h1>
              <Badge variant="accent">
                <Dot pulse color="accent" /> ONLINE
              </Badge>
            </div>
            <p className="text-xs text-[var(--kz-text-muted,#7d8590)] tracking-tight">
              High-fidelity artwork asset viewer and direct stream downloader
            </p>
          </div>
        </div>

        <TechLabel
          label="NETWORK_NODE"
          jp="ピクシブ抽出端末"
          coord="PX-ARCHIVE-V2"
        />
      </header>

      {/* Target Input Section */}
      <CornerFrame className="p-6 bg-[var(--kz-bg-surface,#11151c)]">
        <form onSubmit={handleFetch} className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <span className="text-xs uppercase tracking-widest text-[var(--kz-text-muted,#7d8590)] font-semibold flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[var(--kz-accent,#e5a93c)] shrink-0" /> TARGET URL OR ID
            </span>
            <span className="text-[11px] text-[var(--kz-text-muted,#7d8590)] font-mono break-all sm:break-normal">
              e.g. 115894819 or pixiv.net/artworks/...
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Paste URL or ID (e.g. 115894819)..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="w-full bg-[var(--kz-bg-deep,#0a0c10)] border border-[var(--kz-border,#262c36)] px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-[var(--kz-text-primary,#e6edf3)] placeholder-[var(--kz-text-muted,#7d8590)] focus:outline-none focus:border-[var(--kz-accent,#e5a93c)] rounded-none transition-colors font-mono"
              />
            </div>

            <Button
              variant="primary"
              onClick={handleFetch}
              disabled={loading || !inputUrl.trim()}
              className="flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> FETCHING...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" /> INSPECT ARTWORK
                </>
              )}
            </Button>
          </div>
        </form>
      </CornerFrame>

      {/* Error notification */}
      {error && (
        <div className="border border-red-500/40 bg-red-950/20 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <div className="font-semibold text-red-300 uppercase tracking-wide">Error resolving target</div>
            <div className="text-red-400/90 text-xs mt-1">{error}</div>
          </div>
        </div>
      )}

      {/* Artwork Inspector & Gallery */}
      {artwork && (
        <div className="flex flex-col gap-6">
          {/* Metadata Card */}
          <BracketCard className="p-6 bg-[var(--kz-bg-surface,#11151c)] flex flex-col gap-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge variant="accent">ID: {artwork.id}</Badge>
                  <Badge variant="default">
                    <Layers className="w-3 h-3 mr-1" /> {artwork.pageCount} PAGES
                  </Badge>
                  <a
                    href={`https://www.pixiv.net/artworks/${artwork.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[var(--kz-accent,#e5a93c)] hover:underline ml-1"
                  >
                    ORIGINAL PIXIV PAGE <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-[var(--kz-text-primary,#e6edf3)] mt-2">
                  {artwork.title}
                </h2>
                <div className="text-xs text-[var(--kz-text-muted,#7d8590)] mt-1 flex items-center gap-2">
                  <span>Artist: <strong className="text-[var(--kz-text-primary,#e6edf3)]">{artwork.userName}</strong></span>
                  <span>({artwork.userAccount})</span>
                  <span>• Date: {artwork.uploadDate ? new Date(artwork.uploadDate).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="primary"
                  onClick={handleDownloadAll}
                  disabled={downloadingAll || !artwork.pages?.length}
                  className="flex items-center gap-2"
                >
                  {downloadingAll ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> PACKAGING ZIP...
                    </>
                  ) : (
                    <>
                      <Archive className="w-4 h-4" /> DOWNLOAD ALL AS ZIP ({artwork.pageCount})
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 py-3 border-y border-[var(--kz-border,#262c36)] text-xs text-[var(--kz-text-muted,#7d8590)]">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[var(--kz-accent,#e5a93c)]" />
                <span>{artwork.viewCount.toLocaleString()} views</span>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-400" />
                <span>{artwork.likeCount.toLocaleString()} likes</span>
              </div>
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-blue-400" />
                <span>{artwork.bookmarkCount.toLocaleString()} bookmarks</span>
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>{artwork.width} × {artwork.height} px</span>
              </div>
            </div>

            {/* Tags */}
            {artwork.tags && artwork.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {artwork.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] bg-[var(--kz-bg-deep,#0a0c10)] border border-[var(--kz-border,#262c36)] px-2 py-0.5 text-[var(--kz-text-muted,#7d8590)] hover:text-[var(--kz-accent,#e5a93c)] transition-colors"
                  >
                    #{t.tag} {t.translation?.en && <span className="opacity-60">({t.translation.en})</span>}
                  </span>
                ))}
              </div>
            )}
          </BracketCard>

          {/* Grid of Pages / Images */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artwork.pages?.map((page, index) => {
              const previewUrl = `/api/proxy?url=${encodeURIComponent(page.urls.regular || page.urls.original)}`;
              const originalUrl = page.urls.original;

              return (
                <CornerFrame
                  key={index}
                  className="bg-[var(--kz-bg-surface,#11151c)] flex flex-col justify-between overflow-hidden"
                >
                  {/* Image container */}
                  <div className="relative group bg-[var(--kz-bg-deep,#0a0c10)] aspect-square flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt={`${artwork.title} - p${index}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={() => setPreviewModalUrl(previewUrl)}
                        className="p-2.5 bg-[var(--kz-bg-surface,#11151c)] border border-[var(--kz-border,#262c36)] text-[var(--kz-text-primary,#e6edf3)] hover:text-[var(--kz-accent,#e5a93c)] transition-colors"
                        title="Expand Preview"
                      >
                        <Maximize2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="absolute top-2 left-2">
                      <Badge variant="default">#{index + 1} / {artwork.pageCount}</Badge>
                    </div>

                    <div className="absolute bottom-2 right-2 text-[10px] bg-black/75 px-1.5 py-0.5 border border-white/10 text-white/70">
                      {page.width} × {page.height}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="p-3 border-t border-[var(--kz-border,#262c36)] flex items-center justify-between gap-2">
                    <span className="text-xs text-[var(--kz-text-muted,#7d8590)] font-mono">
                      PAGE {index + 1}
                    </span>
                    <Button
                      variant="primary"
                      onClick={() => handleDownloadSingle(originalUrl, index)}
                      disabled={downloadingIndex === index}
                      className="text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      {downloadingIndex === index ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> DOWNLOADING...
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" /> SAVE ORIGINAL
                        </>
                      )}
                    </Button>
                  </div>
                </CornerFrame>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal image preview */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewModalUrl}
              alt="Expanded preview"
              className="max-w-full max-h-[85vh] object-contain border border-[var(--kz-border,#262c36)]"
            />
            <div className="mt-3 text-xs text-[var(--kz-text-muted,#7d8590)] font-mono">
              CLICK ANYWHERE TO CLOSE
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
