import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

// Generates the full PWA icon set from one source image.
// Run `npx pwa-assets-generator` to (re)generate into public/.
export default defineConfig({
  preset,
  images: ['public/jotpad-logo-canva.png'],
})
