/**
 * Module 1 : Mise en route et cadrage, la spécification.
 *
 * Avant d'écrire du code, vous décrivez ce que vous construisez : pour qui, ce
 * que l'application fait, et ce qu'elle ne fait pas. C'est ce document que vous
 * relirez à chaque module, et que vous donnerez à votre assistant IA pour qu'il
 * travaille dans le bon cadre.
 *
 * Cette suite vérifie que le document existe et qu'il a la forme attendue. Elle
 * ne juge pas le fond : c'est le rôle de la relecture par un mentor.
 *
 * Contrat attendu, exporté par `src/academie/module-1.ts`, à côté de la fiche
 * de mise en route :
 *
 *   export const specification = {
 *     chemin: string,   // par exemple 'docs/specification.md'
 *   }
 *
 * Le document doit contenir au moins trois sections, dont les titres parlent
 * du problème, des utilisateurs et des fonctionnalités. Il parle de l'annonce,
 * de la catégorie, de la recherche, de l'offre et de la messagerie, dit ce qu'il
 * est interdit de vendre sur votre site, et dit où se placent les signalements
 * et les avis : dans votre projet, ou hors de son périmètre.
 */
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { specification } from '../../../src/academie/module-1'

/** Minuscules et sans accents : « Modération », « moderation » et « MODÉRATION » se valent. */
function plain(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('fr')
}

/**
 * Le document, sans les consignes du gabarit : elles sont en italique, entre
 * deux « _ », et ne comptent ni comme du texte rédigé ni pour les mots cherchés.
 */
function document() {
  const path = resolve(process.cwd(), specification.chemin)
  if (!existsSync(path)) return ''
  return readFileSync(path, 'utf8')
    .replace(/(^|\s)_[^_]+?_(?=\s|$)/g, '$1')
    .replace(/Remplacez chaque consigne en italique par votre texte\.\s+Gardez les titres : les\s+vérifications du module 1 les cherchent\./, '')
}

function headings(text: string) {
  return text
    .split('\n')
    .filter((line) => /^#{1,3}\s+\S/.test(line))
    .map((line) => plain(line.replace(/^#+\s*/, '')))
}

describe('le document de spécification', () => {
  it('est déclaré et se trouve dans votre dépôt', () => {
    expect(specification, 'exportez un objet nommé specification').toBeTypeOf('object')
    expect(specification.chemin, 'indiquez le chemin du document').toBeTypeOf('string')

    const path = resolve(process.cwd(), specification.chemin)
    const inside = relative(process.cwd(), path)
    expect(
      !inside.startsWith('..') && !isAbsolute(inside),
      'le document doit être dans votre dépôt',
    ).toBe(true)
    expect(existsSync(path), `aucun fichier à ${specification.chemin}`).toBe(true)
  })

  it('est un document rédigé, pas un gabarit vide', () => {
    const body = document()
      .split('\n')
      .filter((line) => !/^#/.test(line))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    expect(body.length, 'rédigez au moins quelques paragraphes').toBeGreaterThan(800)
  })
})

describe('ses sections', () => {
  const expected = [
    { label: 'le problème', pattern: /probleme/ },
    { label: 'les utilisateurs', pattern: /utilisateur/ },
    { label: 'les fonctionnalités', pattern: /fonctionnalite/ },
  ]

  for (const section of expected) {
    it(`contient une section sur ${section.label}`, () => {
      expect(
        headings(document()).some((title) => section.pattern.test(title)),
        `ajoutez un titre qui parle de ${section.label}`,
      ).toBe(true)
    })
  }
})

describe('son contenu', () => {
  it('décrit l’annonce, la catégorie et la recherche', () => {
    const text = plain(document())
    expect(text, 'décrivez ce qu’est une annonce').toMatch(/annonce/)
    expect(text, 'parlez des catégories').toMatch(/categorie/)
    expect(text, 'dites comment on trouve une annonce').toMatch(/recherch|cherch/)
  })

  it('situe l’offre et la messagerie entre acheteur et vendeur', () => {
    const text = plain(document())
    expect(text, 'parlez de l’offre d’un acheteur').toMatch(/\boffre/)
    expect(text, 'situez la conversation avec le vendeur').toMatch(/conversation|messagerie|message/)
  })

  // Un site d'annonces refuse certains objets : la règle s'écrit dès le cadrage.
  it('dit ce qu’il est interdit de vendre', () => {
    const text = plain(document())
    expect(text, 'écrivez ce qui est interdit à la vente sur votre site').toMatch(/interdit|prohibe|illegal|illicite/)
  })

  // Dans le périmètre ou en dehors : l'essentiel est d'avoir tranché.
  it('dit où se placent les signalements et les avis', () => {
    const text = plain(document())
    expect(text, 'situez les signalements').toMatch(/signalement|signaler|moderation/)
    expect(text, 'situez les avis sur les vendeurs').toMatch(/\bavis\b|evaluation/)
  })
})
