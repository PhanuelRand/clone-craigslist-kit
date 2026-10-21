// Donne le rôle de modérateur à un compte, ou le lui retire (module 16).
//
// Usage :
//   node --env-file=.env scripts/nommer-moderateur.mjs courriel@example.org
//   node --env-file=.env scripts/nommer-moderateur.mjs courriel@example.org --retirer
//
// En production, donnez l'adresse de la base de production pour cette seule
// commande, comme pour `npm run migrate` au module 15.
//
// Ce fichier vous appartient. Remplacez les noms ci-dessous par ceux de vos
// tables et de vos colonnes : le script ne les devine pas.

import pg from 'pg'

const TABLE_DES_COMPTES = 'membres'
const COLONNE_COURRIEL = 'courriel'
const COLONNE_ROLES = 'roles' // une liste de rôles, par exemple {MEMBER,MODERATOR}

const [courriel, option] = process.argv.slice(2)
if (!courriel) {
  console.error('Indiquez le courriel du compte, puis --retirer pour retirer le rôle.')
  process.exit(2)
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL est vide. Lancez le script avec --env-file=.env.')
  process.exit(2)
}

const retirer = option === '--retirer'
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
try {
  const { rowCount } = await client.query(
    retirer
      ? `update ${TABLE_DES_COMPTES}
            set ${COLONNE_ROLES} = array_remove(${COLONNE_ROLES}, 'MODERATOR')
          where lower(${COLONNE_COURRIEL}) = lower($1)`
      : `update ${TABLE_DES_COMPTES}
            set ${COLONNE_ROLES} = array_append(array_remove(${COLONNE_ROLES}, 'MODERATOR'), 'MODERATOR')
          where lower(${COLONNE_COURRIEL}) = lower($1)`,
    [courriel],
  )
  if (rowCount === 0) console.log('Aucun compte avec ce courriel.')
  else console.log(retirer ? 'Rôle de modérateur retiré.' : 'Ce compte est maintenant modérateur.')
} finally {
  await client.end()
}
