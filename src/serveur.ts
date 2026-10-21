import { serve } from '@hono/node-server'
import { app } from './app'

/**
 * Le point d'entrée de votre API : il démarre l'application décrite dans
 * `app.ts`, sur le port 3000 en local, ou sur celui que l'hébergeur indique.
 *
 * Lancez-le avec `npm run dev`. Les routes s'écrivent dans `app.ts`, pas ici.
 */
const port = Number(process.env.PORT ?? 3000)

serve({ fetch: app.fetch, port }, () => {
  console.log(`API à l'écoute sur http://localhost:${port}`)
})
