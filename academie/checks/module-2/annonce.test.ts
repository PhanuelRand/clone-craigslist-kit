/**
 * Module 2 : Architecture, le cycle de vie d'une annonce.
 *
 * Suite de conformité écrite par l'Académie. Elle appelle VOTRE code à travers
 * le fichier traducteur du module. Ces fichiers font partie du harnais : les
 * modifier confie votre remise à un mentor.
 *
 * Contrat attendu, exporté par `src/academie/module-2.ts` :
 *
 *   export type ListingStatus = 'ACTIVE' | 'RESERVED' | 'SOLD' | 'EXPIRED' | 'REMOVED'
 *
 *   export class Listing {
 *     static publish(input: {
 *       sellerId: string
 *       priceKind: 'FIXED' | 'NEGOTIABLE' | 'FREE' | 'SWAP'
 *       price: number | null
 *     }): Listing                 // lève si le prix n'est pas valide (voir prix.test.ts)
 *     readonly status: ListingStatus
 *     transitionTo(next: ListingStatus): void   // lève si le passage est interdit
 *   }
 *
 * Une annonce publiée est en ligne (ACTIVE). Une offre acceptée la réserve
 * pour un acheteur (RESERVED); si la vente tombe à l'eau, elle revient en
 * ligne. Elle finit vendue (SOLD), expirée (EXPIRED) au bout de trente jours,
 * ou retirée (REMOVED) par son vendeur ou la modération.
 *
 *   ACTIVE    -> RESERVED, SOLD, EXPIRED, REMOVED
 *   RESERVED  -> ACTIVE, SOLD, REMOVED
 *   EXPIRED   -> ACTIVE (renouvelée), REMOVED
 *   SOLD      -> REMOVED
 *   REMOVED   -> rien
 *
 * Tout autre passage lève une erreur, y compris rester dans le même statut.
 */
import { describe, expect, it } from 'vitest'
import { Listing } from '../../../src/academie/module-2'

const seller = '11111111-1111-4111-8111-111111111111'

function published() {
  return Listing.publish({ sellerId: seller, priceKind: 'FIXED', price: 150_000 })
}

function advanceTo(listing: Listing, steps: string[]) {
  for (const step of steps) listing.transitionTo(step as never)
  return listing
}

const ALLOWED: Record<string, string[]> = {
  ACTIVE: ['RESERVED', 'SOLD', 'EXPIRED', 'REMOVED'],
  RESERVED: ['ACTIVE', 'SOLD', 'REMOVED'],
  EXPIRED: ['ACTIVE', 'REMOVED'],
  SOLD: ['REMOVED'],
  REMOVED: [],
}

/** Le chemin le plus court pour amener une annonce neuve à ce statut. */
const PATH_TO: Record<string, string[]> = {
  ACTIVE: [],
  RESERVED: ['RESERVED'],
  SOLD: ['SOLD'],
  EXPIRED: ['EXPIRED'],
  REMOVED: ['REMOVED'],
}

const STATUSES = Object.keys(ALLOWED)

describe('cycle de vie d’une annonce', () => {
  it('naît en ligne', () => {
    expect(published().status).toBe('ACTIVE')
  })

  it('se réserve pour un acheteur, puis se vend', () => {
    const listing = advanceTo(published(), ['RESERVED', 'SOLD'])
    expect(listing.status).toBe('SOLD')
  })

  it('revient en ligne quand une vente tombe à l’eau', () => {
    const listing = advanceTo(published(), ['RESERVED', 'ACTIVE'])
    expect(listing.status).toBe('ACTIVE')
  })

  it('se renouvelle après avoir expiré', () => {
    const listing = advanceTo(published(), ['EXPIRED', 'ACTIVE'])
    expect(listing.status).toBe('ACTIVE')
  })

  it('refuse de remettre en ligne une annonce vendue', () => {
    const listing = advanceTo(published(), ['SOLD'])
    expect(() => listing.transitionTo('ACTIVE' as never)).toThrow()
  })

  // Une annonce réservée ne compte plus ses jours : elle attend son acheteur.
  it('refuse de faire expirer une annonce réservée', () => {
    const listing = advanceTo(published(), ['RESERVED'])
    expect(() => listing.transitionTo('EXPIRED' as never)).toThrow()
  })

  it('ne laisse rien sortir d’un retrait', () => {
    for (const next of STATUSES) {
      const listing = advanceTo(published(), ['REMOVED'])
      expect(() => listing.transitionTo(next as never), `REMOVED vers ${next}`).toThrow()
    }
  })
})

describe('le tableau complet des passages', () => {
  for (const from of STATUSES) {
    for (const to of STATUSES) {
      const allowed = ALLOWED[from]?.includes(to) ?? false
      it(`${allowed ? 'permet' : 'refuse'} ${from} vers ${to}`, () => {
        const listing = advanceTo(published(), PATH_TO[from] ?? [])
        if (allowed) {
          listing.transitionTo(to as never)
          expect(listing.status).toBe(to)
        } else {
          expect(() => listing.transitionTo(to as never)).toThrow()
          expect(listing.status, 'un passage refusé ne change pas le statut').toBe(from)
        }
      })
    }
  }
})

describe('la publication', () => {
  it('refuse de publier une annonce dont le prix n’est pas valide', () => {
    expect(() => Listing.publish({ sellerId: seller, priceKind: 'FIXED', price: 0 })).toThrow()
    expect(() => Listing.publish({ sellerId: seller, priceKind: 'FREE', price: 5_000 })).toThrow()
  })

  it('publie une annonce gratuite et un échange', () => {
    expect(Listing.publish({ sellerId: seller, priceKind: 'FREE', price: 0 }).status).toBe('ACTIVE')
    expect(Listing.publish({ sellerId: seller, priceKind: 'SWAP', price: null }).status).toBe('ACTIVE')
  })
})
