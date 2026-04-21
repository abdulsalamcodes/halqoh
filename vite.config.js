import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    svelte(),
    legacy({
      targets: ['safari >= 12', 'ios >= 12'],
    }),
  ],
  base: '/',
  build: {
    rollupOptions: {
      input: {
        index: 'index.html',
        mysessions: 'mysessions.html',
        about: 'about.html',
        admin: 'admin.html',
      },
    },
  },
})