import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],

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
