import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        background: 'src/background.js',
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'background' ? '[name].js' : 'assets/[name]-[hash].js';
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'cytoscape',
      'cytoscape-cola',
      'cytoscape-fcose',
      'webcola',
      'toastify-js',
      'hotkeys-js',
      'fuse.js',
    ],
  },
});
