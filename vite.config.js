import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  base: '/',
  envPrefix: 'VITE_',
  build: {
    target: ['es2020', 'safari15'],
    rollupOptions: {
      input: {
        index: 'index.html',
        mysessions: 'mysessions.html',
        about: 'about.html',
      },
    },
  },
})