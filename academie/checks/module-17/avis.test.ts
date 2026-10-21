/**
 * Module 17 : Les avis après une vente. Module Platine.
 *
 * Comme sur Kijiji, l'acheteur et le vendeur s'évaluent après une vente :
 * une note de 1 à 5 et un commentaire. Sur le profil d'un membre, la moyenne
 * de ses notes dit aux suivants à qui ils ont affaire.
 *
 * Les avis sont publiés à l'aveugle : aucun des deux ne voit l'avis de l'autre
 * avant d'avoir écrit le sien. Un avis est publié quand l'autre a écrit le sien
 * pour la même vente, ou quatorze jours après la vente. Passé ces quatorze
 * jours, on ne peut plus en écrire.
 *
 * Contrat attendu, exporté par `src/academie/module-17.ts` :
 *
 *   export function createMember(input?: { name?: string }): Promise<string>
 *   export function createListing(input?: { ...ceux du module 7 }): Promise<string>
 *   export function makeOffer(input: { listingId; buyerId; amount })      // module 9
 *   export function acceptOffer(input: { offerId; sellerId })             // module 9
 *
 *   export function createSale(input?: {
 *     sellerId?: string            // par défaut un vendeur neuf
 *     soldAt?: string              // un instant ISO 8601; par défaut maintenant
 *   }): Promise<{ listingId: string; sellerId: string; buyerId: string }>
 *                                  // une annonce, une offre acceptée d'un acheteur neuf,
 *                                  // et l'annonce marquée vendue à l'instant soldAt
 *
 *   export function leaveReview(input: {
 *     listingId: string; authorId: string
 *     rating: number               // un entier de 1 à 5
 *     comment: string
 *     now: string                  // un instant ISO 8601
 *   }): Promise<{ status: number }>
 *                                  // 201; 400 pour une note hors de 1 à 5 ou à virgule;
 *                                  // 403 si l'auteur n'est ni l'acheteur ni le vendeur,
 *                                  // ou si l'annonce n'est pas vendue; 409 pour un second avis;
 *                                  // 410 plus de quatorze jours après la vente
 *
 *   export function reviewsOf(input: {
 *     memberId: string; now: string
 *   }): Promise<{
 *     average: number | null       // la moyenne des notes publiées, à un chiffre après la virgule
 *     count: number                // le nombre d'avis publiés
 *     items: { rating: number; comment: string; authorRole: 'BUYER' | 'SELLER' }[]
 *   }>
 *
 * Un avis porte sur l'autre partie de la vente : l'avis de l'acheteur va au
 * vendeur, et inversement. Un avis non publié ne compte ni dans la moyenne ni
 * dans le nombre.
 */
import { describe, expect, it } from 'vitest'
import {
  acceptOffer,
  createListing,
  createMember,
  createSale,
  leaveReview,
  makeOffer,
  reviewsOf,
} from '../../../src/academie/module-17'

const soldAt = '2030-07-01T10:00:00.000Z'
const nextDay = '2030-07-02T10:00:00.000Z'
const fourteenDaysLater = '2030-07-15T10:00:00.000Z'

function review(listingId: string, authorId: string, rating: number, now = nextDay) {
  return leaveReview({ listingId, authorId, rating, comment: 'Échange simple et rapide.', now })
}

describe('écrire un avis', () => {
  it('accepte l’avis de l’acheteur et celui du vendeur, une fois chacun', async () => {
    const { listingId, sellerId, buyerId } = await createSale({ soldAt })
    expect((await review(listingId, buyerId, 5)).status).toBe(201)
    expect((await review(listingId, sellerId, 4)).status).toBe(201)
    expect((await review(listingId, buyerId, 1)).status, 'un second avis du même auteur').toBe(409)
  })

  it('refuse une note hors de 1 à 5, ou à virgule, avec 400', async () => {
    const { listingId, buyerId } = await createSale({ soldAt })
    for (const rating of [0, 6, 3.5]) {
      expect((await review(listingId, buyerId, rating)).status, `note ${rating}`).toBe(400)
    }
  })

  it('refuse l’avis d’un membre qui n’a pas pris part à la vente, avec 403', async () => {
    const { listingId } = await createSale({ soldAt })
    expect((await review(listingId, await createMember(), 1)).status).toBe(403)
  })

  it('refuse un avis sur une annonce réservée mais pas encore vendue, avec 403', async () => {
    const sellerId = await createMember()
    const listingId = await createListing({ sellerId })
    const buyerId = await createMember()
    const { offerId = '' } = await makeOffer({ listingId, buyerId, amount: 10_000 })
    await acceptOffer({ offerId, sellerId })

    expect((await review(listingId, buyerId, 5)).status).toBe(403)
  })

  it('refuse un avis plus de quatorze jours après la vente, avec 410', async () => {
    const { listingId, buyerId } = await createSale({ soldAt })
    expect((await review(listingId, buyerId, 5, '2030-07-15T10:01:00.000Z')).status).toBe(410)
  })
})

describe('la publication à l’aveugle', () => {
  it('ne publie pas un avis tant que l’autre n’a pas écrit le sien', async () => {
    const { listingId, sellerId, buyerId } = await createSale({ soldAt })
    await review(listingId, buyerId, 5)

    expect(await reviewsOf({ memberId: sellerId, now: nextDay })).toEqual({ average: null, count: 0, items: [] })
  })

  it('publie les deux avis dès que le second est écrit', async () => {
    const { listingId, sellerId, buyerId } = await createSale({ soldAt })
    await review(listingId, buyerId, 5)
    await review(listingId, sellerId, 4)

    const ofSeller = await reviewsOf({ memberId: sellerId, now: nextDay })
    expect(ofSeller.count).toBe(1)
    expect(ofSeller.items).toEqual([{ rating: 5, comment: 'Échange simple et rapide.', authorRole: 'BUYER' }])
    const ofBuyer = await reviewsOf({ memberId: buyerId, now: nextDay })
    expect(ofBuyer.items).toEqual([{ rating: 4, comment: 'Échange simple et rapide.', authorRole: 'SELLER' }])
  })

  it('publie un avis seul quatorze jours après la vente, pas avant', async () => {
    const { listingId, sellerId, buyerId } = await createSale({ soldAt })
    await review(listingId, buyerId, 3)

    expect((await reviewsOf({ memberId: sellerId, now: '2030-07-15T09:59:00.000Z' })).count).toBe(0)
    expect((await reviewsOf({ memberId: sellerId, now: fourteenDaysLater })).count).toBe(1)
  })
})

describe('la moyenne d’un vendeur', { timeout: 30_000 }, () => {
  it('fait la moyenne des avis publiés, arrondie à un chiffre après la virgule', async () => {
    const sellerId = await createMember()
    for (const rating of [5, 4, 4]) {
      const { listingId, buyerId } = await createSale({ sellerId, soldAt })
      await review(listingId, buyerId, rating)
    }

    const result = await reviewsOf({ memberId: sellerId, now: fourteenDaysLater })
    expect(result.count).toBe(3)
    expect(result.average).toBe(4.3)
  })

  it('ne compte pas un avis qui n’est pas encore publié', async () => {
    const sellerId = await createMember()
    const first = await createSale({ sellerId, soldAt })
    await review(first.listingId, first.buyerId, 5)
    await review(first.listingId, sellerId, 5)
    const second = await createSale({ sellerId, soldAt: '2030-07-10T10:00:00.000Z' })
    await review(second.listingId, second.buyerId, 1, '2030-07-11T10:00:00.000Z')

    const result = await reviewsOf({ memberId: sellerId, now: '2030-07-12T10:00:00.000Z' })
    expect(result).toMatchObject({ count: 1, average: 5 })
  })

  it('ne montre ni l’auteur ni ses coordonnées', async () => {
    const { listingId, sellerId, buyerId } = await createSale({ soldAt })
    await review(listingId, buyerId, 5)
    await review(listingId, sellerId, 5)

    const [item] = (await reviewsOf({ memberId: sellerId, now: nextDay })).items
    expect(Object.keys(item ?? {}).join(' '), 'un avis ne porte que la note, le commentaire et le rôle').not.toMatch(
      /email|courriel|phone|telephone/i,
    )
  })
})
