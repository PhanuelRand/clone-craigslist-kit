/**
 * Module 2 : Architecture, la date d'expiration.
 *
 * Une annonce reste en ligne un nombre de jours comptés à Madagascar
 * (décision 0006). Le jour de la publication compte : une annonce publiée le
 * 10 juillet pour trente jours est en ligne du 10 juillet au 8 août inclus, et
 * expire le 9 août.
 *
 * Le moment de la publication est un instant, en UTC. Le jour de publication
 * est celui de Madagascar, UTC+3, sans heure d'été : un instant de 22 h 00 UTC
 * le 10 juillet tombe le 11 juillet à Madagascar.
 *
 * Contrat attendu, exporté par `src/academie/module-2.ts` :
 *
 *   export function expiresOn(input: {
 *     publishedAt: string     // un instant ISO 8601, par exemple '2030-07-10T06:00:00.000Z'
 *     days: number            // la durée de mise en ligne, en jours
 *   }): string                // 'AAAA-MM-JJ' : le premier jour où l'annonce n'apparaît plus
 *
 * Le calcul ne dépend pas du fuseau de la machine qui l'exécute.
 */
import { describe, expect, it } from 'vitest'
import { expiresOn } from '../../../src/academie/module-2'

describe('la date d’expiration', () => {
  it('compte trente jours à partir du jour de publication', () => {
    expect(expiresOn({ publishedAt: '2030-07-10T06:00:00.000Z', days: 30 })).toBe('2030-08-09')
  })

  // 20 h 59 UTC, c'est 23 h 59 à Antananarivo : encore le 10 juillet.
  it('range une publication de 23 h 59 dans le jour même, heure de Madagascar', () => {
    expect(expiresOn({ publishedAt: '2030-07-10T20:59:00.000Z', days: 30 })).toBe('2030-08-09')
  })

  // 21 h 00 UTC, c'est minuit à Antananarivo : déjà le 11 juillet.
  it('range une publication de minuit dans le lendemain, heure de Madagascar', () => {
    expect(expiresOn({ publishedAt: '2030-07-10T21:00:00.000Z', days: 30 })).toBe('2030-08-10')
  })

  it('lit un instant écrit avec un autre décalage horaire', () => {
    expect(expiresOn({ publishedAt: '2030-07-11T01:30:00+03:00', days: 30 })).toBe('2030-08-10')
  })

  it('passe d’une année à l’autre', () => {
    expect(expiresOn({ publishedAt: '2030-12-15T10:00:00.000Z', days: 30 })).toBe('2031-01-14')
  })

  it('tient compte du 29 février des années bissextiles', () => {
    expect(expiresOn({ publishedAt: '2032-02-15T10:00:00.000Z', days: 30 })).toBe('2032-03-16')
    expect(expiresOn({ publishedAt: '2031-02-15T10:00:00.000Z', days: 30 })).toBe('2031-03-17')
  })

  it('accepte une autre durée', () => {
    expect(expiresOn({ publishedAt: '2030-07-10T06:00:00.000Z', days: 7 })).toBe('2030-07-17')
  })
})
