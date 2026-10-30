import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // O campo `module` do react-iconly aponta para um bundle único com todos os ícones (~470 kB);
      // o build ESM fatiado deixa o tree-shaking levar só os ícones usados.
      'react-iconly': path.resolve(import.meta.dirname, 'node_modules/react-iconly/dist/index.mjs'),
    },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
})
