#!/usr/bin/env node
// Lanceur des vérifications de l'Académie IA (ADR-0016).
//
// Usage : node academie/run.mjs 3
//         node academie/run.mjs 12 --seul
//
// Exécute les suites des modules 1 à N : elles sont cumulatives, donc une
// régression sur une étape déjà validée fait échouer les suivantes. C'est
// exactement ce que fait l'intégration continue : lancez-le avant de pousser.
//
// Avec --seul, seule la suite du module N tourne, avec les mêmes réglages et
// la même base de vérification. C'est utile pour relire un échec sans attendre
// les autres modules; cela ne valide pas le module.

import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative, sep } from 'node:path'

const checksDir = join(dirname(fileURLToPath(import.meta.url)), 'checks')
const target = Number(process.argv[2])
const seul = process.argv.includes('--seul')

if (!Number.isInteger(target) || target < 1) {
  console.error('Usage : node academie/run.mjs <numéro de module> [--seul]')
  process.exit(2)
}

// Sur votre machine, les réglages viennent de votre fichier .env, dont
// l'adresse de votre base. Dans GitHub, ils viennent du workflow.
if (existsSync('.env')) process.loadEnvFile('.env')

/** Lance une commande; une seule chaîne, pour que Windows n'avertisse pas. */
function lancer(commande) {
  return spawnSync(commande, { stdio: 'inherit', shell: true })
}

// Les vérifications créent des comptes et des annonces d'essai. Sur votre
// machine, elles écrivent dans une base à part si vous en avez une, pour que
// votre application ne se remplisse pas de fausses données.
if (process.env.DATABASE_URL_VERIFICATION) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_VERIFICATION
  console.log('Base des vérifications : DATABASE_URL_VERIFICATION. Application des migrations…')
  if (lancer('npm run migrate --if-present').status !== 0) {
    console.error('Les migrations ne passent pas sur la base des vérifications.')
    console.error('Deux causes possibles. La base n’existe pas : créez-la (module 2).')
    console.error('Ou une migration échoue sur des lignes laissées par un essai précédent, par exemple')
    console.error('des doublons après le module 12 : supprimez la base des vérifications, recréez-la, puis relancez.')
    process.exit(1)
  }
}

if (target >= 5 && !process.env.DATABASE_URL) {
  console.error('DATABASE_URL est vide : les vérifications à partir du module 5 ont besoin')
  console.error('de votre base. Copiez .env.example en .env et remplissez-le (module 2).')
  process.exit(2)
}

// Les suites sont cumulatives : valider le module N exige les modules 1 à N.
// Le séparateur final compte : vitest lit un chemin comme un filtre, et
// « module-1 » sélectionnerait aussi « module-10 » à « module-17 ».
// Le module 18, l'extra visuel, suit le module 15 sans exiger les modules
// Platine : ses suites sont celles des modules 1 à 15, puis la sienne.
const EXTRA_VISUEL = 18
const modules = seul
  ? [target]
  : target === EXTRA_VISUEL
    ? [...Array.from({ length: 15 }, (_unused, index) => index + 1), EXTRA_VISUEL]
    : Array.from({ length: target }, (_unused, index) => index + 1)

const suites = modules.map((numero) => ({
  name: `module-${numero}`,
  path: join(checksDir, `module-${numero}`) + sep,
  // Pour vitest : relatif au dépôt, avec des « / », qu'aucun shell ne réinterprète.
  filtre: relative(process.cwd(), join(checksDir, `module-${numero}`)).split(sep).join('/') + '/',
}))

// Une suite absente ne doit jamais se lire comme une réussite.
const missing = suites.filter((suite) => !existsSync(suite.path))
if (missing.length > 0) {
  console.error(`Suites introuvables : ${missing.map((suite) => suite.name).join(', ')}.`)
  console.error('Le harnais est incomplet; restaurez-le depuis le dépôt modèle.')
  process.exit(2)
}

let failed = 0
for (const suite of suites) {
  console.log(`\n── ${suite.name} ${'─'.repeat(Math.max(0, 40 - suite.name.length))}`)
  // Le lanceur de tests vient de votre dépôt, pas du harnais.
  const result = lancer(`npx vitest run "${suite.filtre}"`)
  if (result.status !== 0) failed += 1
}

if (failed > 0) {
  console.error(`\n${failed} suite(s) en échec. Le module ${target} n'est pas validé.`)
  process.exit(1)
}
if (seul) {
  console.log(`\nLa suite du module ${target} est au vert. Lancez « npm run academie ${target} » pour valider le module.`)
} else {
  console.log(`\nToutes les suites jusqu'au module ${target} sont au vert.`)
}
