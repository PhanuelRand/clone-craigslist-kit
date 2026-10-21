/**
 * Module 14 : Tests, les vôtres.
 *
 * Jusqu'ici, les vérifications de l'Académie testaient votre code. Elles
 * s'arrêteront à la fin du parcours; votre application, elle, continuera de
 * changer. Ce module vous fait écrire vos propres tests, ceux qui garderont
 * l'application juste quand plus personne ne la vérifiera pour vous.
 *
 * Cette suite ne remplace pas vos tests : elle vérifie qu'ils existent, qu'ils
 * passent, et qu'ils couvrent les trois parcours où une erreur fait le plus de
 * tort : l'offre et la vente, le paiement de la mise à la une, et la
 * messagerie avec le blocage.
 *
 * Contrat attendu, exporté par `src/academie/module-14.ts` :
 *
 *   export const testsEtudiant = {
 *     fichiers: string[],   // par exemple ['src/offres.test.ts']
 *   }
 *
 * Les fichiers sont les vôtres : ils ne peuvent pas se trouver dans le dossier
 * `academie/`, qui appartient au harnais.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { testsEtudiant } from '../../../src/academie/module-14'

function plain(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr')
}

function paths() {
  return testsEtudiant.fichiers.map((file) => resolve(process.cwd(), file))
}

function sources() {
  return paths()
    .filter((path) => existsSync(path))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n')
}

/** Les noms donnés à `it(...)` et `test(...)`, entre guillemets ou accents graves. */
function testNames() {
  return [...sources().matchAll(/\b(?:it|test)\(\s*(['"`])([\s\S]*?)\1/g)].map((match) =>
    plain(match[2] ?? ''),
  )
}

describe('vos fichiers de test', () => {
  it('sont déclarés', () => {
    expect(testsEtudiant, 'exportez un objet nommé testsEtudiant').toBeTypeOf('object')
    expect(Array.isArray(testsEtudiant.fichiers), 'fichiers est une liste').toBe(true)
    expect(testsEtudiant.fichiers.length, 'déclarez au moins un fichier').toBeGreaterThan(0)
  })

  it('existent dans votre dépôt, hors du harnais', () => {
    for (const path of paths()) {
      const inside = relative(process.cwd(), path)
      expect(!inside.startsWith('..') && !isAbsolute(inside), 'restez dans votre dépôt').toBe(
        true,
      )
      expect(inside.split(/[\\/]/)[0], `${inside} appartient au harnais`).not.toBe('academie')
      expect(existsSync(path), `aucun fichier à ${inside}`).toBe(true)
    }
  })

  it('contiennent au moins six tests, et chacun vérifie quelque chose', () => {
    expect(testNames().length, 'écrivez au moins six tests').toBeGreaterThanOrEqual(6)
    for (const path of paths().filter((file) => existsSync(file))) {
      expect(readFileSync(path, 'utf8'), `${path} : un test sans expect ne vérifie rien`).toMatch(
        /\bexpect\(/,
      )
    }
  })
})

describe('ce qu’ils couvrent', () => {
  const topics = [
    { label: 'l’offre ou la vente', pattern: /offre|vente|vendu|reserv|offer/ },
    { label: 'le paiement', pattern: /paie|paye|payment|encaiss|a la une|mise en avant|promotion/ },
    { label: 'la messagerie ou le blocage', pattern: /message|conversation|bloqu|blocage|block/ },
  ]

  for (const topic of topics) {
    it(`nomment au moins un test sur ${topic.label}`, () => {
      expect(
        testNames().some((name) => topic.pattern.test(name)),
        `aucun nom de test ne parle de ${topic.label}`,
      ).toBe(true)
    })
  }
})

describe('leur exécution', () => {
  // Vos tests tournent dans un processus à part, comme `npm test` les lance
  // chez vous, avec la base des vérifications.
  it('passent tous', { timeout: 180_000 }, () => {
    const files = testsEtudiant.fichiers
    // Une seule chaîne de commande : Windows n'avertit pas, et npx est trouvé partout.
    const commande = ['npx vitest run', ...files.map((file) => `"${file}"`)].join(' ')
    const result = spawnSync(commande, { encoding: 'utf8', shell: true, env: process.env })
    expect(result.status, `${result.stdout ?? ''}\n${result.stderr ?? ''}`.slice(-3000)).toBe(0)
  })
})
