import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import javaScriptObfuscator from 'vite-plugin-javascript-obfuscator'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    javaScriptObfuscator({
      apply: 'build',
      options: {
        // Encrypt string literals so they can't be searched
        stringArray: true,
        stringArrayEncoding: ['rc4'],
        stringArrayThreshold: 0.75,
        // Rotate the string array to make static analysis harder
        stringArrayRotate: true,
        stringArrayShuffle: true,
        // Mangle identifiers beyond what esbuild already does
        identifierNamesGenerator: 'mangled-shuffled',
        // Rename globals to random names
        renameGlobals: false,
        // Inject dead code paths to confuse reverse engineers
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.2,
        // Split string literals into chunks
        splitStrings: true,
        splitStringsChunkLength: 5,
        // Disable source map output
        sourceMap: false,
        // Compact output
        compact: true,
        // Skip vendor chunks (react, etc.) — only obfuscate our code
        exclude: [/node_modules/],
      },
    }),
  ],

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',

    // Never emit source maps in production — prevents reverse-engineering
    sourcemap: false,

    // Use esbuild for minification (name mangling, dead code elimination)
    minify: 'esbuild',

    // Aggressive chunk splitting makes the bundle harder to read
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Hashed filenames prevent predictable bundle paths
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',
        // Split large vendor chunks so no single file is easily readable
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('lucide')) return 'vendor-icons';
            return 'vendor';
          }
        },
      },
    },
  },

  // Ensure VITE_ env vars only contain non-secret values
  // Never put secrets in VITE_ vars — they are embedded in the JS bundle
  envPrefix: 'VITE_',

})
