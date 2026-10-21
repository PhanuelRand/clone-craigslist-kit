// Lance vos propres tests (module 14).
//
// Usage : npm test
//
// Vos tests créent des comptes, des annonces et des offres. Quand .env définit
// DATABASE_URL_VERIFICATION, ils les créent dans cette base-là, comme les
// vérifications de l'Académie, et votre application reste propre.

import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

if (existsSync('.env')) process.loadEnvFile('.env')
if (process.env.DATABASE_URL_VERIFICATION) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_VERIFICATION
}

const fichiers = process.argv.slice(2).map((fichier) => `"${fichier}"`)
const commande = ['npx vitest run --dir src --passWithNoTests', ...fichiers].join(' ')
const resultat = spawnSync(commande, { stdio: 'inherit', shell: true })
process.exit(resultat.status ?? 1)
