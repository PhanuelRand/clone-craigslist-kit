/**
 * Module 11 : Le paiement de la mise « À la une ».
 *
 * Un vendeur paie 5 000 Ar pour placer son annonce « À la une » pendant sept
 * jours : elle passe devant les autres dans la recherche. Les jours partent du
 * paiement si l'annonce n'est pas à la une, et de la fin de la mise en avant
 * en cours si elle l'est : un vendeur qui prolonge en avance ne perd aucun
 * jour.
 *
 * Le prestataire de paiement est simulé : vous l'écrivez vous-même, dans votre
 * API. Il confirme les paiements et signe ses webhooks comme le ferait un vrai
 * prestataire, par exemple un service de Mobile Money. Aucun compte chez un
 * prestataire n'est nécessaire, et aucune carte bancaire.
 *
 * Contrat attendu, exporté par `src/academie/module-11.ts` :
 *
 *   export function createMember(input?: { name?: string }): Promise<string>
 *   export function createListing(input?: { ...ceux du module 7 }): Promise<string>
 *
 *   export function capturePayment(input: {
 *     listingId: string; memberId: string
 *     amount: number; idempotencyKey: string
 *     now: string                      // un instant ISO 8601
 *   }): Promise<{
 *     status: number                   // 201, ou 200 pour une clé déjà vue;
 *                                      // 400 si le montant n'est pas 5 000;
 *                                      // 403 si ce n'est pas le vendeur;
 *                                      // 409 si l'annonce n'est pas en ligne
 *     chargeId?: string
 *   }>
 *
 *   export function listCharges(listingId: string): Promise<{ chargeId: string; amount: number }[]>
 *
 *   export function promotion(input: {
 *     listingId: string; now: string
 *   }): Promise<{ featured: boolean; until: string | null }>   // until : instant ISO 8601
 *
 *   export function search(input: {
 *     ...ceux du module 7
 *     now?: string                     // l'instant présent; absent : l'horloge
 *   }): Promise<{
 *     items: { listingId: string; featured: boolean; ... }[]
 *     nextCursor: string | null
 *   }>
 *
 *   export function signWebhook(payload: string): string
 *   export function handleWebhook(input: {
 *     payload: string; signature: string
 *   }): Promise<{ status: number }>
 *
 * Les montants sont des entiers, en ariary, qui n'a pas de centimes.
 *
 * Dans la recherche, les annonces à la une à l'instant `now` viennent d'abord,
 * puis les autres; dans chaque groupe, les plus récentes d'abord. La
 * pagination par curseur du module 7 tient compte de ce classement.
 *
 * `signWebhook` n'existe que pour permettre à cette suite de fabriquer une
 * signature valide. Votre serveur, lui, vérifie celle du prestataire.
 *
 * Un événement porte `{ id, type, listingId, memberId, amount, idempotencyKey,
 * paidAt }`. Un événement `payment.succeeded` correctement signé enregistre le
 * débit sous sa clé d'idempotence et prolonge la mise en avant, exactement comme
 * `capturePayment`. Un débit déjà enregistré sous cette clé ne se dédouble pas,
 * et ne prolonge rien une seconde fois.
 */
import { describe, expect, it } from 'vitest'
import {
  capturePayment,
  createListing,
  createMember,
  handleWebhook,
  listCharges,
  promotion,
  search,
  signWebhook,
} from '../../../src/academie/module-11'

const price = 5_000
const paidAt = '2030-07-01T10:00:00.000Z'
const publishedAt = '2030-07-01T08:00:00.000Z'

function time(instant: string | null) {
  return instant === null ? Number.NaN : new Date(instant).getTime()
}

function uniqueCity(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function ownListing(city = uniqueCity('a-la-une'), at = publishedAt) {
  const sellerId = await createMember()
  const listingId = await createListing({ sellerId, city, publishedAt: at })
  return { sellerId, listingId, city }
}

function pay(listingId: string, memberId: string, key: string, now = paidAt, amount = price) {
  return capturePayment({ listingId, memberId, amount, idempotencyKey: key, now })
}

describe('l’encaissement', () => {
  it('débite une fois le prix de la mise en avant', async () => {
    const { sellerId, listingId } = await ownListing()
    const charge = await pay(listingId, sellerId, `${listingId}-1`)

    expect(charge.status).toBe(201)
    expect(charge.chargeId, 'un débit porte un identifiant').toBeTruthy()
    expect(await listCharges(listingId)).toEqual([{ chargeId: charge.chargeId, amount: price }])
  })

  // Un appel réseau qui échoue ne veut pas dire que rien ne s'est passé.
  it('ne double pas le débit quand la même clé est rejouée', async () => {
    const { sellerId, listingId } = await ownListing()
    const key = `${listingId}-1`
    const first = await pay(listingId, sellerId, key)
    const replay = await pay(listingId, sellerId, key)

    expect(replay.chargeId).toBe(first.chargeId)
    expect(await listCharges(listingId)).toHaveLength(1)
  })

  it('ne double pas le débit sous appels simultanés', async () => {
    const { sellerId, listingId } = await ownListing()
    const key = `${listingId}-1`
    await Promise.all(Array.from({ length: 4 }, () => pay(listingId, sellerId, key)))
    expect(await listCharges(listingId)).toHaveLength(1)
  })

  it('refuse un montant qui n’est pas le tarif, avec 400', async () => {
    const { sellerId, listingId } = await ownListing()
    expect((await pay(listingId, sellerId, `${listingId}-1`, paidAt, 500)).status).toBe(400)
    expect(await listCharges(listingId)).toEqual([])
  })

  it('refuse de mettre à la une l’annonce d’un autre, avec 403', async () => {
    const { listingId } = await ownListing()
    const stranger = await createMember()
    expect((await pay(listingId, stranger, `${listingId}-1`)).status).toBe(403)
    expect(await listCharges(listingId)).toEqual([])
  })
})

describe('les sept jours à la une', () => {
  it('donne sept jours à partir du paiement', async () => {
    const { sellerId, listingId } = await ownListing()
    await pay(listingId, sellerId, `${listingId}-1`)

    const during = await promotion({ listingId, now: '2030-07-08T09:59:00.000Z' })
    expect(during.featured).toBe(true)
    expect(time(during.until)).toBe(time('2030-07-08T10:00:00.000Z'))
    expect((await promotion({ listingId, now: '2030-07-08T10:01:00.000Z' })).featured).toBe(false)
  })

  it('n’est pas à la une sans paiement', async () => {
    const { listingId } = await ownListing()
    expect(await promotion({ listingId, now: paidAt })).toEqual({ featured: false, until: null })
  })

  // Prolonger en avance ne fait perdre aucun jour.
  it('prolonge depuis la fin de la mise en avant en cours', async () => {
    const { sellerId, listingId } = await ownListing()
    await pay(listingId, sellerId, `${listingId}-1`)
    await pay(listingId, sellerId, `${listingId}-2`, '2030-07-05T08:00:00.000Z')

    const result = await promotion({ listingId, now: '2030-07-05T08:00:00.000Z' })
    expect(time(result.until)).toBe(time('2030-07-15T10:00:00.000Z'))
  })

  it('repart du jour du paiement après une fin de mise en avant', async () => {
    const { sellerId, listingId } = await ownListing()
    await pay(listingId, sellerId, `${listingId}-1`)
    await pay(listingId, sellerId, `${listingId}-2`, '2030-07-20T12:00:00.000Z')

    const result = await promotion({ listingId, now: '2030-07-20T12:00:00.000Z' })
    expect(time(result.until)).toBe(time('2030-07-27T12:00:00.000Z'))
  })

  it('ne prolonge pas deux fois pour un paiement rejoué', async () => {
    const { sellerId, listingId } = await ownListing()
    const key = `${listingId}-1`
    await pay(listingId, sellerId, key)
    await pay(listingId, sellerId, key)

    const result = await promotion({ listingId, now: paidAt })
    expect(time(result.until)).toBe(time('2030-07-08T10:00:00.000Z'))
  })
})

describe('la place dans la recherche', () => {
  const today = '2030-07-02'
  const now = '2030-07-02T10:00:00.000Z'

  it('place l’annonce à la une devant les plus récentes', async () => {
    const city = uniqueCity('recherche')
    const { sellerId, listingId: featured } = await ownListing(city, '2030-07-01T06:00:00.000Z')
    const recent = await createListing({ city, publishedAt: '2030-07-01T09:00:00.000Z' })
    const middle = await createListing({ city, publishedAt: '2030-07-01T08:00:00.000Z' })
    await pay(featured, sellerId, `${featured}-1`)

    const result = await search({ city, today, now })
    expect(result.items.map((item) => item.listingId)).toEqual([featured, recent, middle])
    expect(result.items.map((item) => item.featured)).toEqual([true, false, false])
  })

  it('remet l’annonce à sa place quand la mise en avant est finie', async () => {
    const city = uniqueCity('fin')
    const { sellerId, listingId: featured } = await ownListing(city, '2030-07-01T06:00:00.000Z')
    const recent = await createListing({ city, publishedAt: '2030-07-01T09:00:00.000Z' })
    await pay(featured, sellerId, `${featured}-1`)

    const later = await search({ city, today: '2030-07-10', now: '2030-07-10T10:00:00.000Z' })
    expect(later.items.map((item) => item.listingId)).toEqual([recent, featured])
  })

  it('garde ce classement d’une page à l’autre, sans doublon', async () => {
    const city = uniqueCity('pages')
    const ids: string[] = []
    for (let hour = 1; hour <= 5; hour += 1) {
      ids.push(await createListing({ city, publishedAt: `2030-07-01T0${hour}:00:00.000Z` }))
    }
    const { sellerId, listingId: featured } = await ownListing(city, '2030-07-01T00:30:00.000Z')
    await pay(featured, sellerId, `${featured}-1`)

    const seen: string[] = []
    let cursor: string | null = null
    for (let page = 0; page < 10; page += 1) {
      const result: Awaited<ReturnType<typeof search>> = await search({ city, today, now, cursor, limit: 2 })
      seen.push(...result.items.map((item) => item.listingId))
      cursor = result.nextCursor
      if (!cursor) break
    }
    expect(seen).toEqual([featured, ...[...ids].reverse()])
  })
})

describe('les webhooks du prestataire', () => {
  function event(id: string, listingId: string, memberId: string, key = `${listingId}-1`) {
    return JSON.stringify({
      id,
      type: 'payment.succeeded',
      listingId,
      memberId,
      amount: price,
      idempotencyKey: key,
      paidAt,
    })
  }

  it('refuse un événement dont la signature est invalide', async () => {
    const { sellerId, listingId } = await ownListing()
    const response = await handleWebhook({ payload: event(`evt-${listingId}`, listingId, sellerId), signature: 'inventee' })

    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(response.status).toBeLessThan(500)
    expect(await listCharges(listingId)).toEqual([])
  })

  it('enregistre le débit et met l’annonce à la une pour un événement correctement signé', async () => {
    const { sellerId, listingId } = await ownListing()
    const payload = event(`evt-${listingId}`, listingId, sellerId)
    const response = await handleWebhook({ payload, signature: signWebhook(payload) })

    expect(response.status).toBeGreaterThanOrEqual(200)
    expect(response.status).toBeLessThan(300)
    expect(await listCharges(listingId)).toHaveLength(1)
    expect((await promotion({ listingId, now: '2030-07-02T00:00:00.000Z' })).featured).toBe(true)
  })

  // Un prestataire redélivre ses événements : c'est normal, pas une anomalie.
  it('absorbe la redélivrance du même événement sans second effet', async () => {
    const { sellerId, listingId } = await ownListing()
    const payload = event(`evt-${listingId}`, listingId, sellerId)
    const signature = signWebhook(payload)
    await handleWebhook({ payload, signature })
    await handleWebhook({ payload, signature })

    expect(await listCharges(listingId)).toHaveLength(1)
    expect(time((await promotion({ listingId, now: paidAt })).until)).toBe(time('2030-07-08T10:00:00.000Z'))
  })

  it('ne dédouble pas un paiement déjà encaissé sous la même clé', async () => {
    const { sellerId, listingId } = await ownListing()
    await pay(listingId, sellerId, `${listingId}-1`)
    const payload = event(`evt-${listingId}`, listingId, sellerId)
    await handleWebhook({ payload, signature: signWebhook(payload) })

    expect(await listCharges(listingId)).toHaveLength(1)
  })
})
