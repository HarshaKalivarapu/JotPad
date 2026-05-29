import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Standard preset, but skip the generated favicon.ico — we use a custom
// cropped + rounded favicon.png (in public/), wired up in index.html.
const preset = {
  ...minimal2023Preset,
  transparent: {
    ...minimal2023Preset.transparent,
    favicons: undefined,
  },
}

// Generates the PWA icon set from one source image.
// Run `npx pwa-assets-generator` to (re)generate into public/.
export default defineConfig({
  preset,
  images: ['public/jotpad-logo-canva.png'],
})
