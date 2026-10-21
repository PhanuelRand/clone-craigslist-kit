/**
 * Module 10 : L'expiration et les publications du jour.
 *
 * Une annonce reste en ligne trente jours, comptés à Madagascar (décision
 * 0006) : publiée le 10 juillet, elle apparaît jusqu'au 8 août inclus et
 * expire le 9 août. Son vendeur peut la renouveler pour trente jours de plus,
 * à partir de sept jours avant son expiration, ou après.
 *
 * Un membre publie trois annonces par jour au plus. Le jour est celui de
 * Madagascar : le compteur repart à zéro à minuit, heure d'Antananarivo,
 * c'est-à-dire à 21 h 00 UTC. Une annonce retirée compte quand même : sinon,
 * publier puis retirer ferait tourner le compteur. Un renouvellement ne compte
 * pas.
 *
 * Contrat attendu, exporté par `src/academie/module-10.ts` :
 *
 *   export function createMember(input?: { name?: string }): Promise<string>
 *
 *   export function publishListing(input: {
 *     sellerId: string
 *     title: string; description?: string
 *     category: string; priceKind: string; price: number | null
 *     city: string
 *     now: string                  // un instant ISO 8601; celui de la publication
 *   }): Promise<{
 *     status: number               // 201; 400 hors des règles du module 6; 429 au-delà du quota
 *     listingId?: string
 *     expiresOn?: string           // 'AAAA-MM-JJ'
 *     reason?: string              // présent quand status n'est pas 201
 *   }>
 *
 *   export function publicationsLeft(input: {
 *     memberId: string; now: string
 *   }): Promise<number>
 *
 *   export function renewListing(input: {
 *     listingId: string; memberId: string; now: string
 *   }): Promise<{
 *     status: number               // 200; 403 pour un autre membre; 409 trop tôt
 *     expiresOn?: string           // la nouvelle date d'expiration
 *     reason?: string
 *   }>
 *
 *   export function removeListing(input: { listingId; memberId })   // module 6
 *   export function search(input: { ...ceux du module 7 })          // module 7
 *
 * `now` est passé par le harnais plutôt que lu sur l'horloge : c'est ce qui
 * rend minuit vérifiable.
 */
import { describe, expect, it } from 'vitest'
import {
  createMember,
  publicationsLeft,
  publishListing,
  removeListing,
  renewListing,
  search,
} from '../../../src/academie/module-10'

const morning = '2030-07-10T06:00:00.000Z' // 9 h 00 à Madagascar

function uniqueCity(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function publish(sellerId: string, now: string, city = uniqueCity('annonce')) {
  return publishListing({
    sellerId,
    title: 'Chaise en bois, bon état',
    description: 'À venir chercher sur place.',
    category: 'meubles',
    priceKind: 'FIXED',
    price: 25_000,
    city,
    now,
  })
}

async function published(sellerId: string, now: string, city?: string) {
  const result = await publish(sellerId, now, city)
  if (!result.listingId) throw new Error(`publication refusée : ${result.reason ?? result.status}`)
  return result
}

async function visibleOn(city: string, today: string) {
  return (await search({ city, today })).items.map((item) => item.listingId)
}

describe('les publications du jour', () => {
  it('commence la journée avec trois publications, et les décompte', async () => {
    const memberId = await createMember()
    expect(await publicationsLeft({ memberId, now: morning })).toBe(3)

    await published(memberId, morning)
    await published(memberId, morning)
    expect(await publicationsLeft({ memberId, now: morning })).toBe(1)
  })

  it('refuse la quatrième publication avec 429 et un motif', async () => {
    const memberId = await createMember()
    for (let index = 0; index < 3; index += 1) await published(memberId, morning)

    const extra = await publish(memberId, morning)
    expect(extra.status, 'la quatrième publication du jour doit être refusée').toBe(429)
    expect(extra.reason, 'le refus doit porter un motif lisible').toBeTruthy()
  })

  it('compte une annonce retirée dans les publications du jour', async () => {
    const memberId = await createMember()
    const { listingId = '' } = await published(memberId, morning)
    await removeListing({ listingId, memberId })

    expect(await publicationsLeft({ memberId, now: morning })).toBe(2)
  })
})

describe('minuit à Madagascar', () => {
  // 20 h 59 UTC, c'est 23 h 59 à Antananarivo : la même journée.
  it('garde le compteur jusqu’à 23 h 59, et le remet à zéro à minuit, heure de Madagascar', async () => {
    const memberId = await createMember()
    for (let index = 0; index < 3; index += 1) await published(memberId, morning)

    const lateEvening = '2030-07-10T20:59:00.000Z'
    const midnight = '2030-07-10T21:00:00.000Z'
    expect(await publicationsLeft({ memberId, now: lateEvening })).toBe(0)
    expect((await publish(memberId, lateEvening)).status).toBe(429)

    expect(await publicationsLeft({ memberId, now: midnight })).toBe(3)
    expect((await publish(memberId, midnight)).status).toBe(201)
  })

  // 22 h 30 UTC le 10, c'est 1 h 30 le 11 à Antananarivo.
  it('range une publication de 1 h 30 du matin dans la nouvelle journée', async () => {
    const memberId = await createMember()
    await published(memberId, '2030-07-10T22:30:00.000Z')

    expect(await publicationsLeft({ memberId, now: '2030-07-10T20:00:00.000Z' })).toBe(3)
    expect(await publicationsLeft({ memberId, now: '2030-07-10T23:00:00.000Z' })).toBe(2)
  })
})

describe('l’expiration', () => {
  it('rend la date d’expiration, trente jours comptés à Madagascar', async () => {
    const memberId = await createMember()
    expect((await published(memberId, morning)).expiresOn).toBe('2030-08-09')
    expect((await published(memberId, '2030-07-10T21:00:00.000Z')).expiresOn).toBe('2030-08-10')
  })

  it('montre l’annonce jusqu’à la veille de son expiration, et plus le jour même', async () => {
    const memberId = await createMember()
    const city = uniqueCity('expiration')
    const { listingId } = await published(memberId, morning, city)

    expect(await visibleOn(city, '2030-07-10')).toEqual([listingId])
    expect(await visibleOn(city, '2030-08-08')).toEqual([listingId])
    expect(await visibleOn(city, '2030-08-09')).toEqual([])
  })
})

describe('le renouvellement', () => {
  it('refuse de renouveler plus de sept jours avant l’expiration, avec 409 et un motif', async () => {
    const memberId = await createMember()
    const { listingId = '' } = await published(memberId, morning)

    const early = await renewListing({ listingId, memberId, now: '2030-07-20T06:00:00.000Z' })
    expect(early.status).toBe(409)
    expect(early.reason, 'le refus doit porter un motif lisible').toBeTruthy()
  })

  it('renouvelle pour trente jours à partir du jour du renouvellement', async () => {
    const memberId = await createMember()
    const city = uniqueCity('renouvellement')
    const { listingId = '' } = await published(memberId, morning, city)

    // Le 5 août, quatre jours avant l'expiration du 9 août.
    const renewed = await renewListing({ listingId, memberId, now: '2030-08-05T06:00:00.000Z' })
    expect(renewed.status).toBe(200)
    expect(renewed.expiresOn).toBe('2030-09-04')
    expect(await visibleOn(city, '2030-09-03')).toEqual([listingId])
  })

  it('remet en ligne une annonce déjà expirée', async () => {
    const memberId = await createMember()
    const city = uniqueCity('expiree')
    const { listingId = '' } = await published(memberId, morning, city)
    expect(await visibleOn(city, '2030-08-15')).toEqual([])

    const renewed = await renewListing({ listingId, memberId, now: '2030-08-15T06:00:00.000Z' })
    expect(renewed.status).toBe(200)
    expect(renewed.expiresOn).toBe('2030-09-14')
    expect(await visibleOn(city, '2030-08-15')).toEqual([listingId])
  })

  it('refuse le renouvellement à un autre membre, avec 403', async () => {
    const { listingId = '' } = await published(await createMember(), morning)
    const stranger = await createMember()
    expect((await renewListing({ listingId, memberId: stranger, now: '2030-08-05T06:00:00.000Z' })).status).toBe(403)
  })

  it('ne compte pas un renouvellement dans les publications du jour', async () => {
    const memberId = await createMember()
    const { listingId = '' } = await published(memberId, morning)
    const renewalDay = '2030-08-06T06:00:00.000Z'
    for (let index = 0; index < 3; index += 1) await published(memberId, renewalDay)

    expect((await renewListing({ listingId, memberId, now: renewalDay })).status).toBe(200)
    expect(await publicationsLeft({ memberId, now: renewalDay })).toBe(0)
  })
})
