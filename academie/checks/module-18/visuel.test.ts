/**
 * Module 18 : Extra, un vrai site d'annonces.
 *
 * L'harmonie d'une interface ne se mesure pas par un programme : un mentor la
 * relit sur vos captures avant et après, avec la liste des dix règles. Cette
 * suite vérifie ce qui, lui, se mesure : que votre interface repose sur un
 * système visuel, et non sur des valeurs écrites au hasard dans chaque écran.
 *
 * Contrat attendu, exporté par `src/academie/module-18.ts` :
 *
 *   export const visuel = {
 *     rapport: string,   // par exemple 'docs/rapports/extra-visuel.md'
 *   }
 *
 * Le rapport montre au moins cinq écrans avant et après, par des images
 * Markdown `![…](chemin)` dont les fichiers existent dans votre dépôt, et la
 * liste des dix règles cochée : `- [x] …`.
 *
 * Ce que la suite lit dans `web/` :
 *
 * - `web/src/styles.css` déclare la couleur d'accent, l'arrondi et la police,
 *   en thème clair et en thème sombre;
 * - aucun écran n'écrit de couleur en dur : ni `#4f46e5`, ni `rgb(…)`, ni
 *   `oklch(…)`, ni les classes de couleur toutes faites de Tailwind comme
 *   `bg-red-500` ou `text-gray-700`. Les couleurs viennent des variables :
 *   `bg-primary`, `text-muted-foreground`;
 * - un espacement écrit à la main, comme `p-[13px]`, est un multiple de 4;
 * - l'interface charge deux familles de police au plus;
 * - chaque balise `<img>` porte un texte alternatif `alt`.
 *
 * Les composants de `web/src/components/ui`, fournis par shadcn, ne sont pas
 * lus : ce sont les vôtres, mais ils lisent déjà les variables.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { visuel } from '../../../src/academie/module-18'

const WEB = resolve(process.cwd(), 'web')
const WEB_SRC = join(WEB, 'src')
const KIT_UI = join(WEB_SRC, 'components', 'ui')

function sourceFiles(directory: string, extensions: RegExp): string[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && extensions.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name))
}

/** Les écrans et composants de l'étudiant, hors composants fournis par shadcn. */
function screens() {
  return sourceFiles(WEB_SRC, /\.(tsx|jsx|ts|js)$/)
    .filter((file) => !file.startsWith(KIT_UI))
    .filter((file) => !/\.test\./.test(file))
    .filter((file) => !/donnees[\\/]fictives/.test(file))
    .map((file) => ({ file: relative(process.cwd(), file), text: readFileSync(file, 'utf8') }))
}

/** Les lignes qui posent problème, avec leur fichier, pour un message utile. */
function offenders(pattern: RegExp) {
  const found: string[] = []
  for (const { file, text } of screens()) {
    text.split('\n').forEach((line, index) => {
      // Une ligne de commentaire peut citer un contre-exemple sans l'appliquer.
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return
      for (const match of line.matchAll(pattern)) found.push(`${file}:${index + 1} ${match[0]}`)
    })
  }
  return found
}

const PALETTES =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'

describe('le système visuel', () => {
  const styles = existsSync(join(WEB_SRC, 'styles.css'))
    ? readFileSync(join(WEB_SRC, 'styles.css'), 'utf8')
    : ''
  const blocks = (selector: RegExp) =>
    [...styles.matchAll(new RegExp(`${selector.source}\\s*\\{([^}]*)\\}`, 'g'))]
      .map((match) => match[1] ?? '')
      .join('\n')

  it('déclare l’accent, l’arrondi et la police dans styles.css', () => {
    const root = blocks(/:root/)
    expect(root, 'déclarez --primary dans :root').toMatch(/--primary\s*:/)
    expect(root, 'déclarez --radius dans :root').toMatch(/--radius\s*:/)
    expect(styles, 'déclarez la police avec --font-sans').toMatch(/--font-sans\s*:/)
  })

  it('redéfinit la couleur d’accent pour le thème sombre', () => {
    expect(blocks(/\.dark/), 'déclarez --primary dans le bloc .dark').toMatch(/--primary\s*:/)
  })
})

describe('les écrans lisent le système visuel', () => {
  it('n’écrivent aucune couleur en dur', () => {
    const literals = offenders(/#[0-9a-fA-F]{3,8}\b(?![\w-])|\b(?:rgba?|hsla?|oklch|oklab)\(/g).filter(
      // Une ancre ou un identifiant d'adresse n'est pas une couleur.
      (line) => !/['"`]#[a-z][\w-]*['"`]/.test(line),
    )
    const palette = offenders(
      new RegExp(`\\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|shadow)-(?:${PALETTES})-\\d{2,3}\\b`, 'g'),
    )
    const arbitrary = offenders(/\b(?:bg|text|border|ring|fill|stroke|from|via|to)-\[(?:#|rgb|hsl|oklch)[^\]]*\]/g)
    const all = [...literals, ...palette, ...arbitrary]
    expect(
      all,
      `remplacez ces couleurs par les variables de styles.css (bg-primary, text-muted-foreground…) :\n${all.slice(0, 15).join('\n')}`,
    ).toEqual([])
  })

  it('écrivent les espacements à la main en multiples de 4', () => {
    const wrong = offenders(
      /\b-?(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)-\[(\d+)px\]/g,
    ).filter((line) => {
      const value = Number(/\[(\d+)px\]/.exec(line)?.[1])
      return value % 4 !== 0
    })
    expect(wrong, `arrondissez ces espacements à un multiple de 4 :\n${wrong.join('\n')}`).toEqual([])
  })

  it('chargent deux familles de police au plus', () => {
    const files = [...sourceFiles(WEB_SRC, /\.(css|tsx?|jsx?)$/), join(WEB, 'index.html')].filter(existsSync)
    const families = new Set<string>()
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      for (const match of text.matchAll(/@fontsource(?:-variable)?\/([\w-]+)/g)) families.add(match[1] ?? '')
      for (const match of text.matchAll(/fonts\.googleapis\.com\/css2?\?([^"'\s>]+)/g)) {
        for (const family of (match[1] ?? '').matchAll(/family=([^:&]+)/g)) families.add(family[1] ?? '')
      }
    }
    expect(families.size, `deux familles au plus : ${[...families].join(', ')}`).toBeLessThanOrEqual(2)
  })

  it('donnent un texte alternatif à chaque image', () => {
    const missing: string[] = []
    for (const { file, text } of screens()) {
      for (const match of text.matchAll(/<img\b[^>]*>/gs)) {
        if (!/\balt=/.test(match[0])) missing.push(`${file} : ${match[0].slice(0, 60)}…`)
      }
    }
    expect(missing, `ajoutez alt à ces images :\n${missing.join('\n')}`).toEqual([])
  })
})

describe('le rapport de remise', () => {
  const path = resolve(process.cwd(), visuel.rapport)
  const text = existsSync(path) ? readFileSync(path, 'utf8') : ''

  it('existe à l’endroit déclaré', () => {
    expect(existsSync(path), `aucun rapport à ${visuel.rapport}`).toBe(true)
  })

  it('montre au moins cinq écrans avant et après, avec des images présentes dans le dépôt', () => {
    const images = [...text.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)].map((match) => match[1] ?? '')
    expect(images.length, 'au moins dix images : cinq écrans, avant et après').toBeGreaterThanOrEqual(10)
    for (const image of images) {
      expect(existsSync(resolve(dirname(path), image)), `image introuvable : ${image}`).toBe(true)
    }
  })

  it('coche les dix règles', () => {
    const ticked = [...text.matchAll(/^\s*[-*] \[[xX]\]/gm)].length
    expect(ticked, 'cochez les dix règles avec - [x]').toBeGreaterThanOrEqual(10)
  })
})
