/**
 * Module 12 : Diagnostic, la vente en double.
 *
 * Aux modules 9 et 10, vos offres et vos publications ont passé toutes leurs
 * vérifications. Elles envoyaient les demandes une par une. Celles-ci les
 * envoient en même temps.
 *
 * Une implémentation qui lit puis écrit laisse une fenêtre entre les deux :
 *
 * - un vendeur qui accepte deux offres au même instant, depuis son téléphone
 *   et son ordinateur, voit les deux demandes lire « l'annonce est en ligne »,
 *   et l'objet est promis à deux acheteurs;
 * - la même offre envoyée cinq fois, par un double clic ou un réseau qui
 *   réessaie, peut s'enregistrer plusieurs fois;
 * - un membre qui publie six annonces d'un coup peut les voir toutes passer :
 *   chaque demande a lu « il reste des publications » avant que les autres
 *   n'écrivent.
 *
 * Aucun test séquentiel ne voit ces défauts. La garantie doit venir de la base :
 * des contraintes d'unicité, une mise à jour conditionnelle du statut, et un
 * verrou sur le vendeur pendant la transaction de publication.
 *
 * Contrat attendu, exporté par `src/academie/module-12.ts` : les fonctions des
 * modules 9 et 10, que vous réexportez.
 *
 *   export function createMember(input?: { name?: string }): Promise<string>
 *   export function createListing(input?: { ...ceux du module 7 }): Promise<string>
 *   export function makeOffer(input: { listingId; buyerId; amount })      // module 9
 *   export function listOffers(input: { listingId; sellerId })            // module 9
 *   export function acceptOffer(input: { offerId; sellerId })             // module 9
 *   export function listingStatus(listingId: string): Promise<string>     // module 9
 *   export function publishListing(input: { ...ceux du module 10 })       // module 10
 *   export function publicationsLeft(input: { memberId; now })            // module 10
 */
import { describe, expect, it } from 'vitest'
import {
  acceptOffer,
  createListing,
  createMember,
  listOffers,
  listingStatus,
  makeOffer,
  publicationsLeft,
  publishListing,
} from '../../../src/academie/module-12'

const now = '2030-07-10T06:00:00.000Z'

async function offerOn(listingId: string) {
  const result = await makeOffer({ listingId, buyerId: await createMember(), amount: 100_000 })
  if (!result.offerId) throw new Error(`offre refusée : ${result.reason}`)
  return result.offerId
}

describe('demandes simultanées', { timeout: 60_000 }, () => {
  // Le test que seule une garantie de la base fait passer de façon fiable.
  it('n’accepte qu’une offre quand le vendeur en accepte deux au même instant', async () => {
    const sales = await Promise.all(
      Array.from({ length: 8 }, async () => {
        const sellerId = await createMember()
        const listingId = await createListing({ sellerId })
        return { sellerId, listingId, offers: [await offerOn(listingId), await offerOn(listingId)] }
      }),
    )

    const responses = await Promise.all(
      sales.flatMap(({ sellerId, offers }) => offers.map((offerId) => acceptOffer({ offerId, sellerId }))),
    )

    expect(
      responses.filter((response) => response.status === 200),
      'une acceptation réussie par annonce, pas deux',
    ).toHaveLength(sales.length)
    for (const { sellerId, listingId } of sales) {
      const accepted = (await listOffers({ listingId, sellerId })).items.filter((item) => item.status === 'ACCEPTED')
      expect(accepted, 'ni zéro offre acceptée, ni deux : exactement une par annonce').toHaveLength(1)
      expect(await listingStatus(listingId)).toBe('RESERVED')
    }
  })

  it('n’enregistre qu’une fois la même offre envoyée cinq fois', async () => {
    const sellerId = await createMember()
    const listingId = await createListing({ sellerId })
    const buyerId = await createMember()

    const results = await Promise.all(
      Array.from({ length: 5 }, () => makeOffer({ listingId, buyerId, amount: 100_000 })),
    )

    expect(results.filter((result) => result.accepted)).toHaveLength(1)
    expect((await listOffers({ listingId, sellerId })).items, 'une seule offre en attente').toHaveLength(1)
  })

  it('ne laisse passer que trois publications sur six envoyées en même temps', async () => {
    const sellerId = await createMember()

    const results = await Promise.all(
      Array.from({ length: 6 }, (_unused, index) =>
        publishListing({
          sellerId,
          title: `Lot de livres numéro ${index + 1}`,
          description: 'Romans et manuels scolaires.',
          category: 'meubles',
          priceKind: 'FIXED',
          price: 10_000,
          city: 'Antananarivo',
          now,
        }),
      ),
    )

    expect(results.filter((result) => result.status === 201)).toHaveLength(3)
    expect(await publicationsLeft({ memberId: sellerId, now })).toBe(0)
  })
})
