/**
 * Module 3 : Design, les écrans.
 *
 * Avant de brancher quoi que ce soit, vous construisez les cinq écrans qui
 * portent le produit, directement dans l'application, avec les composants du
 * kit et des annonces fictives. Ce ne sont pas des maquettes à jeter : ce sont
 * vos vraies pages. Chaque module suivant en branche une sur les vraies données.
 *
 * Cette suite vérifie que les écrans existent, qu'ils sont reliés au routeur,
 * et que le front se construit. Elle ne juge pas leur qualité visuelle : c'est
 * le rôle de la relecture par un mentor.
 *
 * Contrat attendu, exporté par `src/academie/module-3.ts` :
 *
 *   export const ecrans = {
 *     recherche: string,   // l'accueil : la recherche, les catégories, les résultats
 *     annonce: string,     // la fiche d'une annonce : photos, prix, description
 *     publier: string,     // le formulaire de publication d'une annonce
 *     messages: string,    // les conversations avec les acheteurs et les vendeurs
 *     connexion: string,   // la connexion et l'inscription
 *   }
 *
 * Chaque valeur est le chemin d'un fichier `.tsx` sous `web/src`, par exemple
 * 'web/src/pages/recherche.tsx'. Chaque écran exporte un composant, emploie au
 * moins un composant de `@/components/ui`, et un autre fichier de `web/src`
 * l'importe : c'est ce qui le relie à une route.
 *
 * Le formulaire de publication demande une catégorie, dans une liste, et un
 * prix, dans un champ numérique. L'inscription propose un numéro de téléphone,
 * dans un champ de type tel : le serveur le mettra sous une seule forme au
 * module 5.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ecrans } from '../../../src/academie/module-3'

const ECRANS = ['recherche', 'annonce', 'publier', 'messages', 'connexion'] as const
const WEB = resolve(process.cwd(), 'web')
const WEB_SRC = join(WEB, 'src')

function path(ecran: (typeof ECRANS)[number]) {
  return resolve(process.cwd(), ecrans[ecran])
}

function source(ecran: (typeof ECRANS)[number]) {
  return existsSync(path(ecran)) ? readFileSync(path(ecran), 'utf8') : ''
}

function withoutExtension(file: string) {
  return file.slice(0, file.length - extname(file).length)
}

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name))
}

/** Les modules qu'un fichier importe, résolus en chemins sans extension. */
function importsOf(file: string) {
  const text = readFileSync(file, 'utf8')
  const specifiers = [...text.matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g)].map(
    (match) => match[1] ?? '',
  )
  return specifiers
    .filter((specifier) => specifier.startsWith('.') || specifier.startsWith('@/'))
    .map((specifier) =>
      withoutExtension(
        specifier.startsWith('@/')
          ? join(WEB_SRC, specifier.slice(2))
          : resolve(dirname(file), specifier),
      ),
    )
}

/** Le texte écrit en toutes lettres entre deux balises. */
function literalText(tsx: string) {
  return [...tsx.matchAll(/>([^<>{}]+)</g)]
    .map((match) => match[1] ?? '')
    .join(' ')
    .replace(/[^\p{L}]/gu, '')
}

describe('les cinq écrans', () => {
  it('sont déclarés, chacun dans son propre fichier', () => {
    expect(ecrans, 'exportez un objet nommé ecrans').toBeTypeOf('object')
    for (const ecran of ECRANS) {
      expect(ecrans[ecran], `indiquez le fichier de l’écran ${ecran}`).toBeTypeOf('string')
    }
    expect(new Set(ECRANS.map(path)).size, 'un écran par fichier').toBe(ECRANS.length)
  })

  for (const ecran of ECRANS) {
    it(`contient l’écran ${ecran}, en .tsx, sous web/src`, () => {
      const inside = relative(WEB_SRC, path(ecran))
      expect(!inside.startsWith('..'), 'les écrans vivent dans web/src').toBe(true)
      expect(path(ecran), 'un écran React est un fichier .tsx').toMatch(/\.tsx$/)
      expect(existsSync(path(ecran)), `aucun fichier à ${ecrans[ecran]}`).toBe(true)
    })
  }
})

describe('leur construction', () => {
  it('exportent chacun un composant', () => {
    for (const ecran of ECRANS) {
      expect(
        source(ecran),
        `l’écran ${ecran} doit exporter un composant, dont le nom commence par une majuscule`,
      ).toMatch(/export\s+(?:default\s+)?(?:function|const)\s+[A-Z]|export\s+default\s+[A-Z]/)
    }
  })

  it('emploient les composants du kit', () => {
    for (const ecran of ECRANS) {
      expect(
        source(ecran),
        `l’écran ${ecran} doit employer au moins un composant de @/components/ui`,
      ).toMatch(/['"](?:@\/|\.{1,2}\/(?:\.\.\/)*)components\/ui\//)
    }
  })

  it('montrent du texte, pas seulement des cadres vides', () => {
    for (const ecran of ECRANS) {
      expect(
        literalText(source(ecran)).length,
        `l’écran ${ecran} doit dire à l’utilisateur où il se trouve`,
      ).toBeGreaterThanOrEqual(12)
    }
  })

  it('proposent un formulaire et un mot de passe sur l’écran de connexion', () => {
    const tsx = source('connexion')
    expect(tsx, 'la connexion demande un formulaire').toMatch(/<form[\s>]/)
    expect(tsx, 'avec un champ de mot de passe').toMatch(/type=["'{]+password/)
  })

  it('proposent un numéro de téléphone à l’inscription', () => {
    expect(
      source('connexion'),
      'l’inscription propose un numéro de téléphone, dans un champ type="tel"',
    ).toMatch(/type=["'{]+tel["'}]/)
  })

  it('proposent un formulaire de publication avec une catégorie et un prix', () => {
    const tsx = source('publier')
    expect(tsx, 'la publication demande un formulaire').toMatch(/<form[\s>]/)
    expect(
      tsx,
      'la catégorie se choisit dans une liste : <select>, NativeSelect ou Select',
    ).toMatch(/<(?:select|NativeSelect|Select)[\s>]/)
    expect(
      tsx,
      'le prix se saisit dans un champ numérique : type="number" ou inputMode="numeric"',
    ).toMatch(/type=["'{]+number["'}]|inputMode=["'{]+numeric["'}]/)
  })
})

describe('leur place dans l’application', () => {
  // Un écran qu'aucun fichier n'importe n'a pas de route : personne ne le verra.
  it('sont reliés au routeur', () => {
    const screens = new Map(ECRANS.map((ecran) => [withoutExtension(path(ecran)), ecran]))
    const reached = new Set<string>()
    for (const file of sourceFiles(WEB_SRC)) {
      for (const target of importsOf(file)) {
        const ecran = screens.get(target)
        if (ecran && withoutExtension(file) !== target) reached.add(ecran)
      }
    }
    for (const ecran of ECRANS) {
      expect(reached.has(ecran), `aucun fichier n’importe l’écran ${ecran}`).toBe(true)
    }
  })

  // Le front se construit comme au déploiement : types vérifiés, imports résolus.
  it('se construisent sans erreur', { timeout: 180_000 }, () => {
    // Une seule chaîne de commande : Windows n'avertit pas, et npm est trouvé partout.
    const result = spawnSync('npm run build', { cwd: WEB, encoding: 'utf8', shell: true })
    expect(result.status, `${result.stdout ?? ''}\n${result.stderr ?? ''}`.slice(-3000)).toBe(0)
  })
})
