# Pixiv Downloader (Zero-Login / No OAuth)

A lightweight Pixiv illustration and manga downloader built with React, Vite, TypeScript for the frontend and Node.js (Express, TypeScript) for the backend.

It requires no OAuth, no tokens, and no login cookies. Works seamlessly for all-ages artworks and multi-page albums.

---

## How It Works

1. **Artwork Resolution:** Queries Pixiv's public AJAX web endpoints (`/ajax/illust/{id}` and `/touch/ajax/illust/details?illust_id=...`) without requiring login credentials.
2. **CDN Streaming:** Downloads full master resolution (`urls.original`) directly from Pixiv's CDN (`i.pximg.net`) by automatically setting the required `Referer: https://www.pixiv.net/` header.
3. **Browser Compatibility:** Acts as a transparent proxy for image previews (bypassing browser CORS/403 blocks) and streams single downloads or on-the-fly `.ZIP` bundles for multi-page albums.

---

## Quick Start (Single Command)

From the project root:

```bash
# 1. Install all dependencies (if running for the first time)
npm run install:all

# 2. Start both backend and frontend concurrently
npm run dev
```

- **Frontend (UI):** [http://localhost:5173](http://localhost:5173)
- **Backend (API):** [http://localhost:3001](http://localhost:3001)

---

## Features

- **No Authentication Required:** Works out of the box with zero setup.
- **Single Page & Multi-page Album Support:** Automatically detects albums and lets you download individual pictures or download all pages bundled in a `.ZIP`.
- **Quality Selector:** Choose between `Original` (master quality, uncompressed) and `Regular`.
- **Rich Metadata Preview:** Displays artwork title, artist name, avatar, resolution, creation date, view count, like count, and tags.
- **Smart Input Parsing:** Accepts bare illust IDs (`115480000`) or full URLs (`https://www.pixiv.net/artworks/115480000`).

---

## License

This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.
