/**
 * Module 9 : L'offre et la réservation.
 *
 * Un acheteur fait une offre sur une annonce. Le vendeur la lit, l'accepte ou
 * la refuse. Accepter une offre réserve l'annonce pour cet acheteur : elle
 * quitte la recherche, et les autres offres en attente sont refusées. Le
 * vendeur marque ensuite l'annonce vendue, ou la remet en ligne si la vente
 * tombe à l'eau.
 *
 * Les offres acceptées au même instant ne sont pas vérifiées ici, mais au
 * module 12. C'est voulu : une implémentation qui lit puis écrit passe cette
 * suite et échoue celle-là, et c'est ce que le module 12 apprend à
 * diagnostiquer.
 *
 * Contrat attendu, exporté par `src/academie/module-9.ts` :
 *
 *   export function createMember(input?: { name?: string }): Promise<string>
 *   export function createListing(input?: { ...ceux du module 7 }): Promise<string>
 *   export function search(input: { ...ceux du module 7 })
 *
 *   export function makeOffer(input: {
 *     listingId: string; buyerId: string; amount: number   // en ariary
 *   }): Promise<{ accepted: boolean; offerId?: string; reason?: string }>
 *
 *   export function listOffers(input: {
 *     listingId: string; sellerId: string
 *   }): Promise<{
 *     status: number               // 200, ou 403 si ce n'est pas le vendeur
 *     items: { offerId: string; buyerId: string; amount: number; status: OfferStatus }[]
 *   }>
 *
 *   export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' | 'CANCELLED'
 *
 *   export function acceptOffer(input: { offerId: string; sellerId: string }):
 *     Promise<{ status: number }>  // 200; 403 pour un autre; 409 si l'annonce n'est plus en ligne
 *                                  // ou si l'offre n'est plus en attente
 *   export function declineOffer(input: { offerId: string; sellerId: string }):
 *     Promise<{ status: number }>  // 200; 403 pour un autre; 409 si l'offre n'est plus en attente
 *   export function withdrawOffer(input: { offerId: string; buyerId: string }):
 *     Promise<{ status: number }>  // 200; 403 pour un autre; 409 si l'offre n'est plus en attente
 *
 *   export function markSold(input: { listingId: string; sellerId: string }):
 *     Promise<{ status: number }>  // 200; 403 pour un autre; 409 si le passage est interdit
 *   export function releaseReservation(input: { listingId: string; sellerId: string }):
 *     Promise<{ status: number }>  // 200; 403 pour un autre; 409 si l'annonce n'est pas réservée
 *
 *   export function listingStatus(listingId: string): Promise<string>   // 'ACTIVE', 'RESERVED'…
 *
 * Une offre est un entier positif ou nul (0 pour « je le prends » sur une
 * annonce gratuite ou un échange). On ne fait pas d'offre sur sa propre
 * annonce, ni sur une annonce qui n'est pas en ligne. Un acheteur a une seule
 * offre en attente par annonce. Libérer une réservation annule l'offre
 * acceptée (CANCELLED) et remet l'annonce en ligne.
 */
import { describe, expect, it } from 'vitest'
import {
  acceptOffer,
  createListing,
  createMember,
  declineOffer,
  listOffers,
  listingStatus,
  makeOffer,
  markSold,
  releaseReservation,
  search,
  withdrawOffer,
} from '../../../src/academie/module-9'
import { todayInMadagascar } from '../_support/dates'

const today = todayInMadagascar()

function uniqueCity(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function forSale(city = uniqueCity('vente')) {
  const sellerId = await createMember({ name: 'Vendeur' })
  const listingId = await createListing({ sellerId, city, price: 300_000 })
  return { sellerId, listingId, city }
}

async function offer(listingId: string, buyerId: string, amount = 250_000) {
  const result = await makeOffer({ listingId, buyerId, amount })
  if (!result.offerId) throw new Error(`offre refusée : ${result.reason}`)
  return result.offerId
}

async function statusesOf(listingId: string, sellerId: string) {
  const result = await listOffers({ listingId, sellerId })
  return Object.fromEntries(result.items.map((item) => [item.offerId, item.status]))
}

describe('faire une offre', () => {
  it('enregistre l’offre, que le vendeur voit en attente', async () => {
    const { sellerId, listingId } = await forSale()
    const buyerId = await createMember()
    const result = await makeOffer({ listingId, buyerId, amount: 250_000 })

    expect(result.accepted).toBe(true)
    expect(result.offerId, 'une offre porte un identifiant').toBeTruthy()
    const listed = await listOffers({ listingId, sellerId })
    expect(listed.status).toBe(200)
    expect(listed.items).toEqual([{ offerId: result.offerId, buyerId, amount: 250_000, status: 'PENDING' }])
  })

  it('refuse une offre sur sa propre annonce, avec un motif', async () => {
    const { sellerId, listingId } = await forSale()
    const result = await makeOffer({ listingId, buyerId: sellerId, amount: 250_000 })
    expect(result.accepted).toBe(false)
    expect(result.reason, 'le refus doit porter un motif lisible').toBeTruthy()
  })

  it('refuse un montant négatif ou à virgule', async () => {
    const { listingId } = await forSale()
    const buyerId = await createMember()
    expect((await makeOffer({ listingId, buyerId, amount: -1 })).accepted).toBe(false)
    expect((await makeOffer({ listingId, buyerId, amount: 1_000.5 })).accepted).toBe(false)
  })

  it('refuse une seconde offre en attente du même acheteur, avec un motif', async () => {
    const { listingId } = await forSale()
    const buyerId = await createMember()
    await offer(listingId, buyerId)

    const again = await makeOffer({ listingId, buyerId, amount: 280_000 })
    expect(again.accepted, 'une seule offre en attente par acheteur et par annonce').toBe(false)
    expect(again.reason).toBeTruthy()
  })

  it('laisse un acheteur faire une nouvelle offre après un refus', async () => {
    const { sellerId, listingId } = await forSale()
    const buyerId = await createMember()
    const first = await offer(listingId, buyerId, 150_000)
    await declineOffer({ offerId: first, sellerId })

    expect((await makeOffer({ listingId, buyerId, amount: 280_000 })).accepted).toBe(true)
  })

  it('refuse à un autre que le vendeur de lire les offres, avec 403', async () => {
    const { listingId } = await forSale()
    await offer(listingId, await createMember())
    const stranger = await createMember()

    const result = await listOffers({ listingId, sellerId: stranger })
    expect(result.status).toBe(403)
    expect(result.items, 'un tiers ne voit aucune offre').toEqual([])
  })
})

describe('accepter une offre', () => {
  it('réserve l’annonce, la retire de la recherche et refuse les autres offres', async () => {
    const { sellerId, listingId, city } = await forSale()
    const chosen = await offer(listingId, await createMember(), 280_000)
    const other = await offer(listingId, await createMember(), 200_000)

    expect((await acceptOffer({ offerId: chosen, sellerId })).status).toBe(200)

    expect(await listingStatus(listingId)).toBe('RESERVED')
    expect(await statusesOf(listingId, sellerId)).toEqual({ [chosen]: 'ACCEPTED', [other]: 'DECLINED' })
    const found = (await search({ city, today })).items.map((item) => item.listingId)
    expect(found, 'une annonce réservée quitte la recherche').not.toContain(listingId)
  })

  // Côté serveur : connaître l'identifiant d'une offre ne suffit pas à l'accepter.
  it('refuse à un autre que le vendeur d’accepter, avec 403', async () => {
    const { listingId } = await forSale()
    const offerId = await offer(listingId, await createMember())
    const stranger = await createMember()

    expect((await acceptOffer({ offerId, sellerId: stranger })).status).toBe(403)
    expect(await listingStatus(listingId)).toBe('ACTIVE')
  })

  it('refuse une seconde acceptation sur une annonce déjà réservée, avec 409', async () => {
    const { sellerId, listingId } = await forSale()
    const first = await offer(listingId, await createMember())
    const second = await offer(listingId, await createMember())
    await acceptOffer({ offerId: first, sellerId })

    expect((await acceptOffer({ offerId: second, sellerId })).status).toBe(409)
    const statuses = Object.values(await statusesOf(listingId, sellerId))
    expect(statuses.filter((status) => status === 'ACCEPTED'), 'une seule offre acceptée').toHaveLength(1)
  })

  it('refuse une nouvelle offre sur une annonce réservée', async () => {
    const { sellerId, listingId } = await forSale()
    await acceptOffer({ offerId: await offer(listingId, await createMember()), sellerId })

    const late = await makeOffer({ listingId, buyerId: await createMember(), amount: 300_000 })
    expect(late.accepted).toBe(false)
    expect(late.reason).toBeTruthy()
  })
})

describe('retirer une offre', () => {
  it('laisse l’acheteur retirer son offre, qui ne peut plus être acceptée', async () => {
    const { sellerId, listingId } = await forSale()
    const buyerId = await createMember()
    const offerId = await offer(listingId, buyerId)

    expect((await withdrawOffer({ offerId, buyerId })).status).toBe(200)
    expect(await statusesOf(listingId, sellerId)).toEqual({ [offerId]: 'WITHDRAWN' })
    expect((await acceptOffer({ offerId, sellerId })).status).toBe(409)
    expect(await listingStatus(listingId)).toBe('ACTIVE')
  })

  it('refuse à un autre que l’acheteur de retirer l’offre, avec 403', async () => {
    const { listingId } = await forSale()
    const offerId = await offer(listingId, await createMember())
    expect((await withdrawOffer({ offerId, buyerId: await createMember() })).status).toBe(403)
  })
})

describe('après la réservation', () => {
  it('marque l’annonce vendue, et n’accepte plus d’offre', async () => {
    const { sellerId, listingId } = await forSale()
    await acceptOffer({ offerId: await offer(listingId, await createMember()), sellerId })

    expect((await markSold({ listingId, sellerId })).status).toBe(200)
    expect(await listingStatus(listingId)).toBe('SOLD')
    expect((await makeOffer({ listingId, buyerId: await createMember(), amount: 1 })).accepted).toBe(false)
  })

  it('refuse à un autre que le vendeur de marquer l’annonce vendue, avec 403', async () => {
    const { listingId } = await forSale()
    expect((await markSold({ listingId, sellerId: await createMember() })).status).toBe(403)
    expect(await listingStatus(listingId)).toBe('ACTIVE')
  })

  it('remet l’annonce en ligne quand la vente tombe à l’eau', async () => {
    const { sellerId, listingId, city } = await forSale()
    const offerId = await offer(listingId, await createMember())
    await acceptOffer({ offerId, sellerId })

    expect((await releaseReservation({ listingId, sellerId })).status).toBe(200)
    expect(await listingStatus(listingId)).toBe('ACTIVE')
    expect(await statusesOf(listingId, sellerId)).toEqual({ [offerId]: 'CANCELLED' })
    expect((await search({ city, today })).items.map((item) => item.listingId)).toContain(listingId)
    expect((await makeOffer({ listingId, buyerId: await createMember(), amount: 260_000 })).accepted).toBe(true)
  })

  it('refuse de libérer une annonce qui n’est pas réservée, avec 409', async () => {
    const { sellerId, listingId } = await forSale()
    expect((await releaseReservation({ listingId, sellerId })).status).toBe(409)
  })
})
