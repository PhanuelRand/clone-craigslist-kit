// Applique vos migrations SQL à la base désignée par DATABASE_URL.
//
// Usage : npm run migrate
//
// Le script lit les fichiers `.sql` du dossier `migrations/`, dans l'ordre de
// leur nom (d'où les numéros en tête : 001-..., 002-...), et applique ceux qui
// ne l'ont pas encore été. Il retient ce qu'il a fait dans une table
// `migrations_appliquees`, pour ne jamais rejouer un fichier deux fois.
//
// Il tourne sur votre machine, et dans les vérifications de GitHub avant
// chaque suite : c'est ce qui crée vos tables dans la base de vérification.
//
// Ce fichier vous appartient. Si vos migrations sont dans un autre dossier,
// indiquez-le dans la variable MIGRATIONS_DIR.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const dossier = process.env.MIGRATIONS_DIR ?? 'migrations'
const adresse = process.env.DATABASE_URL

if (!adresse) {
  console.error('DATABASE_URL est vide. Copiez .env.example en .env et remplissez-le.')
  process.exit(1)
}

let fichiers
try {
  fichiers = readdirSync(dossier)
    .filter((nom) => nom.endsWith('.sql'))
    .sort()
} catch {
  console.log(`Aucun dossier ${dossier}/ : rien à appliquer.`)
  process.exit(0)
}

const client = new pg.Client({ connectionString: adresse })
await client.connect()

try {
  await client.query(`
    create table if not exists migrations_appliquees (
      nom text primary key,
      appliquee_le timestamptz not null default now()
    )
  `)
  const { rows } = await client.query('select nom from migrations_appliquees')
  const deja = new Set(rows.map((ligne) => ligne.nom))

  for (const nom of fichiers) {
    if (deja.has(nom)) continue
    const sql = readFileSync(join(dossier, nom), 'utf8')
    // Une migration s'applique en entier ou pas du tout.
    await client.query('begin')
    try {
      await client.query(sql)
      await client.query('insert into migrations_appliquees (nom) values ($1)', [nom])
      await client.query('commit')
      console.log(`Appliquée : ${nom}`)
    } catch (erreur) {
      await client.query('rollback')
      console.error(`Échec de ${nom} : ${erreur.message}`)
      process.exitCode = 1
      break
    }
  }
} finally {
  await client.end()
}
