import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Build straight into the Node app's public/ dir so `node src/index.js`
    // can serve the compiled frontend directly — no separate static host.
    outDir: '../public',
    // Never wipe public/ first: public/assets/uploads holds user-uploaded
    // media that must survive a rebuild.
    emptyOutDir: false,
  },
})
