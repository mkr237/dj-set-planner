import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Explicitly enable SPA fallback so the dev server returns index.html for
  // any path that doesn't match a static file — required for /callback.
  appType: 'spa',

  plugins: [react(), tailwindcss()],

  server: {
    // Bind to 127.0.0.1 so the Spotify redirect URI (http://127.0.0.1:5173/callback)
    // reaches the dev server regardless of how the OS resolves 'localhost'.
    host: '127.0.0.1',
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
