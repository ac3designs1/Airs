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
        // ── String encryption ───────────────────────────────────
        stringArray: true,
        stringArrayEncoding: ['rc4'],
        stringArrayThreshold: 0.85,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 4,
        stringArrayWrappersType: 'function',
        // Split strings into small chunks
        splitStrings: true,
        splitStringsChunkLength: 4,
        // ── Identifier mangling ──────────────────────────────────
        identifierNamesGenerator: 'mangled-shuffled',
        identifiersPrefix: '_0x',
        renameGlobals: false,
        renameProperties: false,
        // ── Control flow obfuscation ────────────────────────────
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.4,
        // ── Dead code injection ──────────────────────────────────
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.3,
        // ── Anti-tamper / anti-debug ────────────────────────────
        // Breaks DevTools debugger panel continuously
        debugProtection: true,
        debugProtectionInterval: 3000,
        // Makes code crash if a beautifier tries to reformat it
        selfDefending: true,
        // Remove all console.* calls from production build
        disableConsoleOutput: true,
        // ── Output ──────────────────────────────────────────────
        sourceMap: false,
        compact: true,
        // Only obfuscate our app code, not vendor libraries
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
