import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Auto-update the service worker when a new version is deployed.
      registerType: 'autoUpdate',
      // Pull icons from pwa-assets.config.js and inject them into the
      // manifest + <head> automatically.
      pwaAssets: {
        config: true,
        overrideManifestIcons: true,
      },
      manifest: {
        name: 'JotPad',
        short_name: 'JotPad',
        description: 'A minimalist notes and to-do app.',
        theme_color: '#fcfaf8',
        background_color: '#fcfaf8',
        display: 'standalone',
        start_url: '/',
      },
    }),
  ],
})
