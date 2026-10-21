/**
 * Module 2 : Architecture, le prix d'une annonce.
 *
 * Un prix a une nature et un montant (décision 0002). Le montant est un entier
 * en ariary, qui n'a pas de centimes.
 *
 * Contrat attendu, exporté par `src/academie/module-2.ts` :
 *
 *   export function validatePrice(input: {
 *     priceKind: string              // 'FIXED' | 'NEGOTIABLE' | 'FREE' | 'SWAP'
 *     price: number | null
 *   }): { valid: boolean; reason?: string }   // reason : un motif lisible si invalide
 *
 *   FIXED, NEGOTIABLE   un entier strictement positif
 *   FREE                0, exactement
 *   SWAP                null : un échange n'a pas de montant
 *
 * Une autre nature est invalide.
 */
import { describe, expect, it } from 'vitest'
import { validatePrice } from '../../../src/academie/module-2'

function check(priceKind: string, price: number | null) {
  return validatePrice({ priceKind, price })
}

describe('le prix d’une annonce', () => {
  it('accepte un prix fixe et un prix à débattre entiers et positifs', () => {
    expect(check('FIXED', 150_000).valid).toBe(true)
    expect(check('NEGOTIABLE', 3_200_000).valid).toBe(true)
  })

  it('refuse un prix fixe nul ou négatif, avec un motif', () => {
    for (const price of [0, -5_000]) {
      const result = check('FIXED', price)
      expect(result.valid, `FIXED ${price}`).toBe(false)
      expect(result.reason, 'le refus doit porter un motif lisible').toBeTruthy()
    }
  })

  // L'ariary n'a pas de centimes : un montant à virgule est une erreur de saisie.
  it('refuse un montant à virgule', () => {
    expect(check('FIXED', 1_500.5).valid).toBe(false)
    expect(check('NEGOTIABLE', 99.99).valid).toBe(false)
  })

  it('refuse un prix absent pour une annonce payante', () => {
    expect(check('FIXED', null).valid).toBe(false)
    expect(check('NEGOTIABLE', null).valid).toBe(false)
  })

  it('n’accepte que 0 pour une annonce gratuite', () => {
    expect(check('FREE', 0).valid).toBe(true)
    expect(check('FREE', 5_000).valid).toBe(false)
    expect(check('FREE', null).valid).toBe(false)
  })

  it('n’accepte aucun montant pour un échange', () => {
    expect(check('SWAP', null).valid).toBe(true)
    expect(check('SWAP', 0).valid).toBe(false)
    expect(check('SWAP', 20_000).valid).toBe(false)
  })

  it('refuse une nature de prix inconnue', () => {
    expect(check('GRATUIT', 0).valid).toBe(false)
    expect(check('', 10_000).valid).toBe(false)
  })
})
