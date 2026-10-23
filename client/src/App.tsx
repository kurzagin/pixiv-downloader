import React, { useState } from 'react';
import { 
  Download, 
  ExternalLink, 
  Eye, 
  Heart, 
  Bookmark, 
  Image as ImageIcon, 
  FolderArchive, 
  Sparkles, 
  Check, 
  Loader2, 
  Layers, 
  Calendar,
  User,
  AlertCircle
} from 'lucide-react';
import type { ArtworkData, PageUrl } from './types';

export function App() {
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artwork, setArtwork] = useState<ArtworkData | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | 'all' | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<'original' | 'regular'>('original');

  const handleFetch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputVal.trim();
    if (!query) return;

    setLoading(true);
    setError(null);
    setArtwork(null);

    try {
      const res = await fetch(`/api/illust?target=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch artwork');
      }

      setArtwork(data);
    } catch (err: any) {
      setError(err.message || 'Error occurred while contacting backend');
    } finally {
      setLoading(false);
    }
  };

  const getProxyUrl = (url?: string) => {
    if (!url) return '';
    return `/api/proxy?url=${encodeURIComponent(url)}`;
  };

  const handleDownloadSingle = (page: PageUrl, pageIndex: number) => {
    if (!artwork) return;
    setDownloadingId(pageIndex);
    const targetUrl = selectedQuality === 'original' ? page.original : (page.regular || page.original);
    const ext = targetUrl.split('.').pop()?.split('?')[0] || 'jpg';
    const cleanTitle = artwork.title.replace(/[\\/:*?"<>|]/g, '_');
    const cleanAuthor = artwork.authorName.replace(/[\\/:*?"<>|]/g, '_');
    const filename = `[${cleanAuthor}] ${cleanTitle} (${artwork.id}_p${pageIndex}).${ext}`;

    const downloadEndpoint = `/api/download/single?url=${encodeURIComponent(targetUrl)}&filename=${encodeURIComponent(filename)}`;
    
    // Create an invisible link to trigger direct browser save
    const link = document.createElement('a');
    link.href = downloadEndpoint;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingId(null);
    }, 1200);
  };

  const handleDownloadZip = () => {
    if (!artwork) return;
    setDownloadingId('all');
    const zipEndpoint = `/api/download/zip/${artwork.id}`;
    
    const link = document.createElement('a');
    link.href = zipEndpoint;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingId(null);
    }, 2500);
  };

  const handleQuickPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputVal(text);
      }
    } catch {
      // Ignore clipboard permission errors
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-blue-600 selection:text-white flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-neutral-800/80 bg-neutral-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 text-white p-2 rounded-xl shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                Pixiv DL
              </span>
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                No OAuth / No Login
              </span>
            </div>
          </div>
          <div className="text-xs text-neutral-400">
            High-Resolution Direct Scraper
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Search / Input Box */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden backdrop-blur-sm">
          <div className="max-w-2xl mx-auto flex flex-col gap-4 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Download Pixiv Artworks in Original Quality
            </h1>
            <p className="text-neutral-400 text-sm">
              Paste any Pixiv artwork URL (e.g. <code className="text-blue-400 bg-neutral-800/80 px-1.5 py-0.5 rounded text-xs">pixiv.net/artworks/115480000</code>) or raw artwork ID.
            </p>

            <form onSubmit={handleFetch} className="mt-2 flex flex-col sm:flex-row gap-2 relative">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="https://www.pixiv.net/artworks/115480000 or ID"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none transition-all pr-20"
                />
                <button
                  type="button"
                  onClick={handleQuickPaste}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 transition-colors"
                >
                  Paste
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || !inputVal.trim()}
                className="bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-white font-medium px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 shrink-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    Get Artwork
                  </>
                )}
              </button>
            </form>

            {/* Quick Sample Buttons */}
            <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 mt-1">
              <span>Try sample:</span>
              <button 
                type="button"
                onClick={() => { setInputVal('115480000'); }}
                className="text-blue-400 hover:underline hover:text-blue-300"
              >
                115480000 (Single)
              </button>
              <span>•</span>
              <button 
                type="button"
                onClick={() => { setInputVal('114514867'); }}
                className="text-blue-400 hover:underline hover:text-blue-300"
              >
                114514867 (Multi-page Album)
              </button>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 flex items-start gap-3 text-red-300">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-semibold block text-red-200">Unable to retrieve artwork</span>
              {error}
            </div>
          </div>
        )}

        {/* Artwork Card & Actions */}
        {artwork && (
          <div className="flex flex-col gap-6">
            {/* Meta Card */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start justify-between backdrop-blur-sm">
              <div className="flex flex-col gap-3 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-md bg-neutral-800 font-mono text-neutral-300">
                    ID: {artwork.id}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {artwork.pages.length} {artwork.pages.length === 1 ? 'Page' : 'Pages'}
                  </span>
                  {artwork.createDate && (
                    <span className="text-neutral-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(artwork.createDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white break-words">
                  {artwork.title}
                </h2>

                <div className="flex items-center gap-2 text-sm text-neutral-300">
                  <div className="w-7 h-7 rounded-full bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0 border border-neutral-700">
                    {artwork.authorAvatar ? (
                      <img 
                        src={getProxyUrl(artwork.authorAvatar)} 
                        alt={artwork.authorName}
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <User className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                  <span className="font-medium text-white">{artwork.authorName}</span>
                  {artwork.authorAccount && (
                    <span className="text-neutral-400 text-xs">@{artwork.authorAccount}</span>
                  )}
                </div>

                {artwork.tags && artwork.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {artwork.tags.map((t, idx) => (
                      <span 
                        key={idx} 
                        className="text-xs px-2 py-0.5 rounded-md bg-neutral-800/80 text-neutral-400 hover:text-neutral-200 transition-colors"
                      >
                        #{t.name}{t.translation ? ` (${t.translation})` : ''}
                      </span>
                    ))}
                  </div>
                )}

                {/* Social metrics if available */}
                <div className="flex items-center gap-4 text-xs text-neutral-400 mt-2">
                  {artwork.likeCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      {artwork.likeCount.toLocaleString()}
                    </span>
                  )}
                  {artwork.bookmarkCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                      {artwork.bookmarkCount.toLocaleString()}
                    </span>
                  )}
                  {artwork.viewCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      {artwork.viewCount.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto shrink-0">
                <a
                  href={`https://www.pixiv.net/artworks/${artwork.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-xl border border-neutral-700 hover:bg-neutral-800 text-xs text-neutral-300 font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Pixiv
                </a>

                {artwork.pages.length > 1 && (
                  <button
                    onClick={handleDownloadZip}
                    disabled={downloadingId === 'all'}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-lg shadow-emerald-600/20"
                  >
                    {downloadingId === 'all' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Packaging ZIP...
                      </>
                    ) : (
                      <>
                        <FolderArchive className="w-4 h-4" />
                        Download All as ZIP ({artwork.pages.length})
                      </>
                    )}
                  </button>
                )}

                <div className="flex items-center justify-center gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800 text-xs">
                  <span className="text-neutral-400 pl-2">Quality:</span>
                  <button
                    onClick={() => setSelectedQuality('original')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      selectedQuality === 'original' 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Original
                  </button>
                  <button
                    onClick={() => setSelectedQuality('regular')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      selectedQuality === 'regular' 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Regular
                  </button>
                </div>
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {artwork.pages && artwork.pages.length > 0 && artwork.pages.map((page, idx) => {
                const previewSrc = getProxyUrl(page.regular || page.small || page.original);
                const isDownloadingThis = downloadingId === idx;
                const originalUrl = page.original || '';
                const ext = (originalUrl.split('.').pop() || 'JPG').toUpperCase();

                return (
                  <div
                    key={idx}
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col group transition-all hover:border-neutral-700 shadow-lg"
                  >
                    {/* Header info */}
                    <div className="px-4 py-3 border-b border-neutral-800/80 bg-neutral-950/40 flex items-center justify-between text-xs text-neutral-400">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-200">Page {idx + 1}</span>
                        <span>•</span>
                        <span>{page.width} × {page.height}</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 font-mono text-[10px] text-neutral-300">
                        {ext}
                      </span>
                    </div>

                    {/* Image Display */}
                    <div className="relative bg-neutral-950/80 flex items-center justify-center min-h-[320px] max-h-[550px] overflow-hidden p-2">
                      <img
                        src={previewSrc}
                        alt={`Page ${idx + 1}`}
                        className="object-contain max-h-[530px] w-full rounded-lg transition-transform duration-300 group-hover:scale-[1.01]"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          console.error('Image load error for page', idx, previewSrc);
                          // Fallback to original image if regular fails
                          const target = e.currentTarget;
                          if (!target.dataset.triedOriginal && page.original) {
                            target.dataset.triedOriginal = 'true';
                            target.src = getProxyUrl(page.original);
                          }
                        }}
                      />
                    </div>

                    {/* Download Footer */}
                    <div className="p-4 border-t border-neutral-800/80 bg-neutral-950/60 flex items-center justify-between gap-3">
                      <span className="text-xs text-neutral-400 truncate font-mono">
                        {artwork.id}_p{idx}.{ext.toLowerCase()}
                      </span>

                      <button
                        onClick={() => handleDownloadSingle(page, idx)}
                        disabled={isDownloadingThis}
                        className="bg-neutral-800 hover:bg-neutral-700 active:scale-95 text-white text-xs font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow border border-neutral-700/60 shrink-0"
                      >
                        {isDownloadingThis ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Downloaded!
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 text-blue-400" />
                            Download Original
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 py-6 text-center text-xs text-neutral-500">
        Direct Pixiv Downloader • Streams full-resolution images from Pixiv CDN with no credentials required.
      </footer>
    </div>
  );
}

export default App;
