/**
 * Module 4 : Le numéro de téléphone.
 *
 * Un numéro se range sous une seule forme, `+261` suivi des neuf chiffres
 * (décision 0007), quelle que soit la façon dont le membre l'a tapé. Le
 * parcours accepte les numéros de téléphone mobile de Madagascar : ceux qui
 * commencent par 032, 033, 034, 037 ou 038.
 *
 * Contrat attendu, exporté par `src/academie/module-4.ts` :
 *
 *   export function normalizePhone(raw: string): string | null
 *                     // '+261341234567', ou null si le numéro n'est pas valide
 */
import { describe, expect, it } from 'vitest'
import { normalizePhone } from '../../../src/academie/module-4'

describe('la forme unique d’un numéro', () => {
  it('ramène les écritures courantes à la même forme', () => {
    for (const raw of [
      '0341234567',
      '034 12 345 67',
      '034-12-345-67',
      '034.12.345.67',
      '+261 34 12 345 67',
      '+261341234567',
      '261341234567',
      '00261341234567',
      '  034 12 345 67  ',
    ]) {
      expect(normalizePhone(raw), `« ${raw} »`).toBe('+261341234567')
    }
  })

  it('accepte les cinq préfixes des opérateurs mobiles', () => {
    expect(normalizePhone('032 11 222 33')).toBe('+261321122233')
    expect(normalizePhone('033 11 222 33')).toBe('+261331122233')
    expect(normalizePhone('037 11 222 33')).toBe('+261371122233')
    expect(normalizePhone('038 11 222 33')).toBe('+261381122233')
  })
})

describe('les numéros refusés', () => {
  it('refuse un numéro trop court ou trop long', () => {
    expect(normalizePhone('034 12 345')).toBeNull()
    expect(normalizePhone('034 12 345 678')).toBeNull()
  })

  it('refuse un numéro qui n’est pas un mobile de Madagascar', () => {
    expect(normalizePhone('020 22 123 45'), 'un numéro fixe').toBeNull()
    expect(normalizePhone('+33 6 12 34 56 78'), 'un numéro français').toBeNull()
    expect(normalizePhone('035 12 345 67'), 'un préfixe qui n’existe pas').toBeNull()
  })

  it('refuse un texte qui n’est pas un numéro', () => {
    expect(normalizePhone('')).toBeNull()
    expect(normalizePhone('appelez-moi')).toBeNull()
    expect(normalizePhone('034 12 345 6a')).toBeNull()
  })
})
