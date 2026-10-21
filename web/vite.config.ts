import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // `@` désigne `web/src`. C'est l'alias que shadcn emploie quand il ajoute
    // un composant : sans lui, `npx shadcn add` écrit des imports qui ne
    // résolvent pas.
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Ouvre le serveur aux autres appareils du réseau, pour regarder vos écrans
    // depuis un téléphone pendant que vous développez.
    host: true,
  },
})
