// Exécute un fichier SQL sur votre base, sans avoir besoin de psql.
//
// Usage : node --env-file=.env scripts/sql.mjs scripts/remplissage.sql
//
// La base est celle de DATABASE_URL. Pour en viser une autre, donnez son
// adresse pour cette seule commande, comme pour `npm run migrate`.

import { readFileSync } from 'node:fs'
import pg from 'pg'

const fichier = process.argv[2]
if (!fichier) {
  console.error('Indiquez le fichier SQL à exécuter.')
  process.exit(2)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL est vide. Lancez le script avec --env-file=.env.')
  process.exit(2)
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  const resultats = [await client.query(readFileSync(fichier, 'utf8'))].flat()
  // La dernière requête du fichier est souvent celle qu'on veut lire.
  const derniere = resultats.at(-1)
  const colonnes = derniere?.fields?.map((champ) => champ.name) ?? []
  if (!derniere?.rows?.length) console.log(`Exécuté : ${fichier}`)
  // Une seule colonne, comme le plan d'un EXPLAIN ANALYZE : une ligne par valeur,
  // lisible dans un terminal étroit.
  else if (colonnes.length === 1) for (const ligne of derniere.rows) console.log(String(ligne[colonnes[0]]))
  else console.table(derniere.rows)
} catch (erreur) {
  console.error(`Échec : ${erreur.message}`)
  process.exitCode = 1
} finally {
  await client.end()
}
