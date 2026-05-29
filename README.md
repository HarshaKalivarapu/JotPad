# JotPad

A minimalist, cross-device note-taking app inspired by blank.page. Organize notes into notebooks and pages, format with markdown-style shortcuts, and sync everything to the cloud.

## Features

- **Notebooks & pages** — group notes into notebooks, each holding multiple pages
- **Markdown-style formatting** — `**bold**`, `*italic*`, and `- ` bullet lists with nesting
- **Cloud sync** — notes are stored in Supabase and shared across devices
- **Installable PWA** — add it to a phone or desktop as a standalone app
- **Recently edited first** — pages and notebooks sort by last edit; reopens to where you left off (per device)

## Tech stack

- React + Vite
- Tiptap (rich-text editor)
- Supabase (Postgres + data sync)
- vite-plugin-pwa (manifest + service worker)

## Running locally

```bash
npm install
npm run dev
```

Requires a `.env` file with your Supabase credentials:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Build for production with `npm run build`.
