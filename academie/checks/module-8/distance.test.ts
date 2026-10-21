/**
 * Module 8 : La distance.
 *
 * La recherche apprend à ne montrer que les annonces assez proches, et à dire
 * à quelle distance elles sont, sans jamais révéler où habite le vendeur.
 *
 * Contrat attendu, exporté par `src/academie/module-8.ts` : les fonctions du
 * module 7, avec une position sur l'annonce et une distance dans la recherche.
 *
 *   export function createListing(input?: {
 *     ...les champs du module 7
 *     latitude?: number; longitude?: number   // en degrés décimaux
 *   }): Promise<string>
 *
 *   export function search(input: {
 *     ...les champs du module 7
 *     near?: { latitude: number; longitude: number }   // la position de la personne qui cherche
 *     maxDistanceKm?: number                           // absent : pas de limite
 *   }): Promise<{
 *     items: { listingId: string; title: string; ...; distanceKm?: number }[]
 *     nextCursor: string | null
 *   }>
 *
 * La distance se mesure sur la Terre, en suivant sa courbure : la formule de
 * haversine, avec un rayon terrestre de 6 371 km. Un degré de longitude ne
 * vaut pas un degré de latitude, et Madagascar est dans l'hémisphère sud : ses
 * latitudes sont négatives.
 *
 * `distanceKm` est un entier, arrondi au kilomètre le plus proche, et vaut 1 au
 * moins. Elle est présente quand `near` est donné et que l'annonce a une
 * position. Une annonce sans position n'apparaît pas quand `maxDistanceKm` est
 * donné.
 *
 * Aucun résultat ne contient de latitude ni de longitude. Avec la position
 * exacte d'une annonce, n'importe qui retrouverait la maison du vendeur.
 */
import { describe, expect, it } from 'vitest'
import { createListing, search } from '../../../src/academie/module-8'
import { todayInMadagascar } from '../_support/dates'

const today = todayInMadagascar()

// Le centre d'Antananarivo. Un degré de latitude vaut environ 111,2 km.
const tana = { latitude: -18.9137, longitude: 47.5361 }

function uniqueCity(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** Une position à `km` kilomètres au nord du centre. */
function north(km: number) {
  return { latitude: tana.latitude + km / 111.19493, longitude: tana.longitude }
}

async function found(city: string, maxDistanceKm?: number, extra: Partial<Parameters<typeof search>[0]> = {}) {
  const result = await search({ city, today, near: tana, maxDistanceKm, ...extra })
  return result.items
}

describe('le rayon de recherche', () => {
  it('montre une annonce à 9 km et cache celle à 11 km, pour un rayon de 10 km', async () => {
    const city = uniqueCity('rayon')
    const near = await createListing({ city, ...north(9) })
    await createListing({ city, ...north(11) })

    expect((await found(city, 10)).map((item) => item.listingId)).toEqual([near])
  })

  // Le piège classique : multiplier les degrés par 111 dans les deux directions.
  it('mesure la distance sur la Terre, pas en degrés', async () => {
    const city = uniqueCity('courbure')
    // 0,0935 degré vers l'est : 9,8 km à cette latitude, et non 10,4 km.
    const east = await createListing({ city, latitude: tana.latitude, longitude: tana.longitude + 0.0935 })

    expect((await found(city, 10)).map((item) => item.listingId)).toEqual([east])
  })

  it('cache une annonce sans position quand un rayon est donné', async () => {
    const city = uniqueCity('sans-position')
    const placed = await createListing({ city, ...north(2) })
    await createListing({ city })

    expect((await found(city, 10)).map((item) => item.listingId)).toEqual([placed])
  })

  it('montre toutes les annonces de la ville sans rayon', async () => {
    const city = uniqueCity('sans-rayon')
    await createListing({ city, ...north(40) })
    await createListing({ city })

    expect(await found(city)).toHaveLength(2)
  })

  it('combine le rayon avec le prix et la catégorie', async () => {
    const city = uniqueCity('rayon-et-prix')
    const match = await createListing({ city, ...north(3), category: 'motos', price: 2_000_000 })
    await createListing({ city, ...north(3), category: 'motos', price: 9_000_000 })
    await createListing({ city, ...north(3), category: 'meubles', price: 2_000_000 })
    await createListing({ city, ...north(30), category: 'motos', price: 2_000_000 })

    const items = await found(city, 10, { category: 'vehicules', maxPrice: 3_000_000 })
    expect(items.map((item) => item.listingId)).toEqual([match])
  })
})

describe('la distance affichée', () => {
  it('donne la distance en kilomètres entiers', async () => {
    const city = uniqueCity('arrondi')
    await createListing({ city, ...north(9) })

    const [item] = await found(city, 10)
    expect(item?.distanceKm).toBe(9)
  })

  it('n’annonce jamais moins d’un kilomètre', async () => {
    const city = uniqueCity('voisin')
    await createListing({ city, ...north(0.2) })

    const [item] = await found(city, 10)
    expect(item?.distanceKm).toBe(1)
  })

  it('ne rend jamais la position d’une annonce', async () => {
    const city = uniqueCity('vie-privee')
    const position = north(4)
    await createListing({ city, ...position })

    const items = await found(city, 10)
    expect(items).toHaveLength(1)
    expect(Object.keys(items[0] ?? {}).join(' '), 'aucune coordonnée dans un résultat').not.toMatch(
      /lat|lon|lng|position|coord/i,
    )
    expect(JSON.stringify(items), 'la latitude ne quitte pas le serveur').not.toContain(
      position.latitude.toFixed(3),
    )
  })
})
