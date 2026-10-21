/**
 * Module 7 : La recherche et ses filtres.
 *
 * La recherche montre les annonces en ligne qui correspondent à ce que la
 * personne cherche, les plus récentes d'abord, page par page. Elle est
 * publique : un visiteur non connecté cherche aussi.
 *
 * Contrat attendu, exporté par `src/academie/module-7.ts` :
 *
 *   export function createListing(input?: {
 *     sellerId?: string                 // par défaut un vendeur neuf
 *     title?: string                    // par défaut 'Annonce de vérification'
 *     description?: string              // par défaut ''
 *     category?: string                 // par défaut 'meubles'
 *     priceKind?: string                // par défaut 'FIXED'
 *     price?: number | null             // par défaut 10000
 *     city?: string                     // par défaut 'Antananarivo'
 *     publishedAt?: string              // un instant ISO 8601; par défaut maintenant
 *   }): Promise<string>                 // une annonce en ligne, sans passer par le quota
 *
 *   export function search(input: {
 *     query?: string                    // des mots, cherchés dans le titre et la description
 *     category?: string                 // un slug, principal ou sous-catégorie
 *     city?: string
 *     minPrice?: number; maxPrice?: number   // en ariary, bornes comprises
 *     today: string                     // 'AAAA-MM-JJ', la date du jour à Madagascar
 *     cursor?: string | null; limit?: number
 *   }): Promise<{
 *     items: {
 *       listingId: string; title: string
 *       priceKind: string; price: number | null
 *       city: string; category: string
 *     }[]
 *     nextCursor: string | null
 *   }>
 *
 * Une annonce apparaît quand :
 *   - elle est en ligne (ACTIVE) et pas encore expirée à la date `today`;
 *   - chaque mot de la recherche figure dans son titre ou sa description,
 *     sans tenir compte des majuscules ni des accents : « velo » trouve
 *     « Vélo »;
 *   - elle est dans la catégorie demandée, ou dans l'une de ses
 *     sous-catégories quand la catégorie demandée est principale;
 *   - elle est dans la ville demandée, sans tenir compte des majuscules;
 *   - son prix est entre les bornes demandées. Un échange, qui n'a pas de
 *     prix, n'apparaît pas quand une borne est donnée.
 *
 * Les annonces les plus récentes viennent d'abord. Un résultat ne contient ni
 * le courriel ni le téléphone du vendeur. La pagination est par curseur,
 * jamais par OFFSET : une annonce publiée pendant qu'on feuillette ne doit ni
 * décaler ni dupliquer les résultats déjà vus.
 */
import { describe, expect, it } from 'vitest'
import { createListing, search } from '../../../src/academie/module-7'
import { todayInMadagascar } from '../_support/dates'

const today = todayInMadagascar()

// Chaque test travaille dans sa propre ville : les suites ne se polluent pas.
function uniqueCity(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Un instant d'il y a `minutes` minutes, pour ordonner les annonces. */
function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

async function idsFound(input: Omit<Parameters<typeof search>[0], 'today'>) {
  const result = await search({ ...input, today })
  return result.items.map((item) => item.listingId)
}

describe('les mots de la recherche', () => {
  it('trouve un mot dans le titre ou dans la description', async () => {
    const city = uniqueCity('mots')
    const inTitle = await createListing({ city, title: 'Vélo de ville, trois vitesses' })
    const inDescription = await createListing({
      city,
      title: 'Lot de sport',
      description: 'Un ballon, deux raquettes et un vélo pour enfant.',
    })
    await createListing({ city, title: 'Table basse en bois' })

    expect((await idsFound({ city, query: 'vélo' })).sort()).toEqual([inTitle, inDescription].sort())
  })

  it('ne tient compte ni des majuscules ni des accents', async () => {
    const city = uniqueCity('accents')
    const bike = await createListing({ city, title: 'VÉLO électrique' })

    expect(await idsFound({ city, query: 'velo' })).toEqual([bike])
    expect(await idsFound({ city, query: 'Electrique' })).toEqual([bike])
  })

  it('exige chaque mot quand la recherche en contient plusieurs', async () => {
    const city = uniqueCity('plusieurs-mots')
    const both = await createListing({ city, title: 'Armoire en palissandre' })
    await createListing({ city, title: 'Armoire en pin' })

    expect(await idsFound({ city, query: 'armoire palissandre' })).toEqual([both])
  })
})

describe('les filtres', () => {
  it('trouve les sous-catégories quand on cherche une catégorie principale', async () => {
    const city = uniqueCity('categories')
    const car = await createListing({ city, category: 'voitures' })
    const scooter = await createListing({ city, category: 'motos' })
    await createListing({ city, category: 'meubles' })

    expect((await idsFound({ city, category: 'vehicules' })).sort()).toEqual([car, scooter].sort())
    expect(await idsFound({ city, category: 'motos' })).toEqual([scooter])
  })

  it('ne montre que la ville demandée, sans tenir compte des majuscules', async () => {
    const city = uniqueCity('ville')
    const here = await createListing({ city })
    await createListing({ city: uniqueCity('ailleurs') })

    expect(await idsFound({ city: city.toUpperCase() })).toEqual([here])
  })

  it('respecte les bornes de prix, bornes comprises, et écarte les échanges', async () => {
    const city = uniqueCity('prix')
    const free = await createListing({ city, priceKind: 'FREE', price: 0 })
    const cheap = await createListing({ city, priceKind: 'FIXED', price: 50_000 })
    const edge = await createListing({ city, priceKind: 'NEGOTIABLE', price: 100_000 })
    await createListing({ city, priceKind: 'FIXED', price: 100_001 })
    await createListing({ city, priceKind: 'SWAP', price: null })

    expect((await idsFound({ city, maxPrice: 100_000 })).sort()).toEqual([free, cheap, edge].sort())
    expect((await idsFound({ city, minPrice: 50_000, maxPrice: 100_000 })).sort()).toEqual([cheap, edge].sort())
  })

  it('montre les échanges quand aucune borne n’est donnée', async () => {
    const city = uniqueCity('echange')
    const swap = await createListing({ city, priceKind: 'SWAP', price: null })
    expect(await idsFound({ city })).toEqual([swap])
  })

  it('combine les mots, la catégorie et le prix', async () => {
    const city = uniqueCity('combine')
    const match = await createListing({ city, title: 'Scooter rouge', category: 'motos', price: 2_000_000 })
    await createListing({ city, title: 'Scooter bleu', category: 'motos', price: 5_000_000 })
    await createListing({ city, title: 'Casque de scooter', category: 'meubles', price: 2_000_000 })
    await createListing({ city, title: 'Moto tout-terrain', category: 'motos', price: 2_000_000 })

    expect(await idsFound({ city, query: 'scooter', category: 'vehicules', maxPrice: 3_000_000 })).toEqual([match])
  })
})

describe('ce qu’un résultat montre', () => {
  it('range les annonces les plus récentes d’abord', async () => {
    const city = uniqueCity('ordre')
    const old = await createListing({ city, publishedAt: minutesAgo(30) })
    const recent = await createListing({ city, publishedAt: minutesAgo(1) })
    const middle = await createListing({ city, publishedAt: minutesAgo(10) })

    expect(await idsFound({ city })).toEqual([recent, middle, old])
  })

  it('rend le titre, le prix, la ville et la catégorie, jamais le contact du vendeur', async () => {
    const city = uniqueCity('resultat')
    await createListing({ city, title: 'Réfrigérateur 200 litres', category: 'electromenager', price: 600_000 })

    const [item] = (await search({ city, today })).items
    expect(item).toMatchObject({
      title: 'Réfrigérateur 200 litres',
      category: 'electromenager',
      priceKind: 'FIXED',
      price: 600_000,
      city,
    })
    expect(Object.keys(item ?? {}).join(' '), 'aucune donnée de contact dans un résultat').not.toMatch(
      /email|courriel|phone|telephone|mail/i,
    )
  })
})

describe('pagination par curseur', () => {
  it('parcourt toutes les annonces sans doublon ni oubli', async () => {
    const city = uniqueCity('pagination')
    const created = []
    for (let index = 0; index < 7; index += 1) created.push(await createListing({ city }))

    const seen: string[] = []
    let cursor: string | null = null
    for (let page = 0; page < 20; page += 1) {
      const result: Awaited<ReturnType<typeof search>> = await search({ city, today, cursor, limit: 3 })
      seen.push(...result.items.map((item) => item.listingId))
      cursor = result.nextCursor
      if (!cursor) break
    }
    expect(seen).toHaveLength(created.length)
    expect([...seen].sort()).toEqual([...created].sort())
  })

  // Deux annonces publiées au même instant : le curseur doit savoir les départager.
  it('départage les annonces publiées au même instant', async () => {
    const city = uniqueCity('meme-instant')
    const instant = minutesAgo(5)
    const created = []
    for (let index = 0; index < 5; index += 1) created.push(await createListing({ city, publishedAt: instant }))

    const first = await search({ city, today, limit: 2 })
    const second = await search({ city, today, cursor: first.nextCursor, limit: 2 })
    const third = await search({ city, today, cursor: second.nextCursor, limit: 2 })
    const seen = [...first.items, ...second.items, ...third.items].map((item) => item.listingId)
    expect([...seen].sort()).toEqual([...created].sort())
  })

  // Le test que OFFSET ne passe pas : une publication décale toutes les pages.
  it('ne décale pas les pages déjà vues quand une annonce arrive entre deux', async () => {
    const city = uniqueCity('insertion')
    for (let index = 0; index < 6; index += 1) await createListing({ city, publishedAt: minutesAgo(60 - index) })

    const first = await search({ city, today, limit: 3 })
    expect(first.nextCursor, 'six annonces par pages de trois : il reste une page').toBeTruthy()

    await createListing({ city })

    const second = await search({ city, today, cursor: first.nextCursor, limit: 3 })
    const overlap = second.items
      .map((item) => item.listingId)
      .filter((id) => first.items.some((item) => item.listingId === id))
    expect(overlap, 'aucune annonce de la page 1 ne doit réapparaître page 2').toEqual([])
    expect(second.items).toHaveLength(3)
  })
})
