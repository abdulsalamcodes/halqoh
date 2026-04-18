import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  base: './',
  envPrefix: 'VITE_',
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        mysessions: 'mysessions.html',
        about: 'about.html',
      },
    },
  },
})