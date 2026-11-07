# Pixiv Downloader (Zero-Login / Standalone Monorepo)

A cyber-minimalist Pixiv illustration and manga extractor built as a high-performance monorepo powered by **Bun**, **Next.js**, **Expo (React Native)**, and the **`@kurzagin/ui`** design system.

Requires **zero OAuth**, **no tokens**, and **no login cookies**. Works seamlessly for all-ages artworks and multi-page albums.

---

## Workspace Structure

```
├── apps/
│   ├── web/          # Next.js 16 Web App with streaming proxy & zip bundling
│   └── mobile/       # Standalone Expo (React Native) mobile app (Zero Backend)
└── packages/
    └── ui/           # @kurzagin/ui design system tokens, themes, & cyber-minimalist UI components
```

---

## Apps & Capabilities

### 1. `apps/web` (Next.js Web Client)
- **Direct Web Extractor:** Fast client interface styled with `@kurzagin/ui`.
- **CORS & Referer Streaming:** Server routes (`/api/illust`, `/api/download/single`, `/api/download/all`) act as a transparent proxy setting `Referer: https://www.pixiv.net/` to stream full original master assets directly from Pixiv's CDN (`i.pximg.net`).
- **On-the-fly Zip Bundles:** Downloads multi-page illustration sets directly as a single `.zip` file without local disk storage overhead.

### 2. `apps/mobile` (Expo Mobile App)
- **Zero Backend Required:** Native mobile network requests bypass browser CORS restrictions and supply the `Referer` header directly.
- **Smart Input & Share Parser:** Recognizes bare illustration IDs, URLs (`/artworks/*`, `/en/artworks/*`), and formatted share strings copied directly from the official Pixiv app (e.g., `タイトル | 作者 #pixiv https://www.pixiv.net/en/artworks/12345678`).
- **One-Tap Paste Button:** Reads clipboard contents via `expo-clipboard`, extracts the artwork ID, and immediately queries Pixiv.
- **Deep Linking / Intent Filters:** Configured to handle Pixiv links and Android share intents (`ACTION_VIEW` and `ACTION_SEND`).
- **Cyber-Minimalist Mobile UI:** Safe area notch handling, dark mode palette, fullscreen preview with back gesture / tap-to-dismiss support, and batch extraction.

---

## Quick Start

Using [Bun](https://bun.sh):

```bash
# Install dependencies across all workspaces
bun install

# Start Next.js Web App (http://localhost:3000)
bun dev

# Start Expo Mobile App for Expo Go preview
bun dev:mobile

# Build all packages & apps
bun run build:all
```

---

## Features

- **No Authentication Required:** Works out of the box with zero setup.
- **Single Page & Multi-page Album Support:** Automatically detects albums and lets you download individual pictures or save all pages.
- **Rich Metadata Preview:** Displays artwork title, artist name, username, resolution, creation date, view count, like count, bookmark count, and tags.
- **Dual Platform:** Run it on the web or test it on your mobile device via Expo Go.

---

## Author & Attribution

- **Made by:** [Kurzagin](https://kurzagin.com)
- **Repository:** [github.com/kurzagin/pixiv-downloader](https://github.com/kurzagin/pixiv-downloader)

---

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.
