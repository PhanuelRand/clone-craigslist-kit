/**
 * Module 4 : Mots de passe, comptes et droits.
 *
 * Contrat attendu, exporté par `src/academie/module-4.ts`, à côté de
 * `normalizePhone` :
 *
 *   export class Member {
 *     static register(input: {
 *       email: string; name: string
 *       phone?: string           // facultatif; tel que le membre l'a tapé
 *     }): Member                 // lève si le numéro est donné mais invalide
 *     readonly phone: string | null   // la forme unique, '+261…', ou null
 *     readonly status: 'ACTIVE' | 'SUSPENDED'
 *     readonly suspensionReason: string | null
 *     suspend(reason: string): void      // lève si le motif est vide
 *     reinstate(): void
 *     canPost(): boolean                 // peut publier une annonce
 *   }
 *
 *   export function hashPassword(plain: string): Promise<string>
 *   export function verifyPassword(plain: string, hash: string): Promise<boolean>
 *
 *   export type Role = 'MEMBER' | 'MODERATOR'
 *   export type Action =
 *     'POST_LISTING' | 'EDIT_LISTING' | 'MAKE_OFFER' | 'SEND_MESSAGE' | 'EDIT_PROFILE' | 'MODERATE'
 *
 *   export function authorize(input: {
 *     roles: Role[]                         // [] pour un visiteur non connecté
 *     memberStatus?: 'ACTIVE' | 'SUSPENDED' // absent : ACTIVE
 *     action: Action
 *     isOwner?: boolean                     // pour EDIT_LISTING : l'annonce est à lui
 *   }): { allowed: boolean; status: number }
 *
 * Un membre modifie, réserve ou retire ses propres annonces (`EDIT_LISTING`),
 * jamais celles des autres, même modérateur : la modération a son action à
 * elle. Un membre suspendu peut encore se connecter et corriger son profil
 * (`EDIT_PROFILE`). Il ne peut plus publier, modifier ses annonces, faire
 * d'offre, écrire, ni modérer. Un compte peut porter les deux rôles : membre et
 * modérateur.
 *
 * `authorize` est la décision d'autorisation de votre serveur, isolée pour être
 * testable. Vos routes doivent l'appeler : masquer un bouton dans l'interface
 * n'est pas une autorisation.
 */
import { describe, expect, it } from 'vitest'
import { Member, authorize, hashPassword, verifyPassword } from '../../../src/academie/module-4'

const MEMBER_ACTIONS = ['POST_LISTING', 'MAKE_OFFER', 'SEND_MESSAGE', 'EDIT_PROFILE'] as const
const ALL_ACTIONS = [...MEMBER_ACTIONS, 'EDIT_LISTING', 'MODERATE'] as const

function registered() {
  return Member.register({ email: 'voahangy@example.org', name: 'Voahangy' })
}

describe('l’inscription d’un membre', () => {
  it('crée un membre actif, qui peut publier', () => {
    const member = registered()
    expect(member.status).toBe('ACTIVE')
    expect(member.canPost()).toBe(true)
  })

  it('range le numéro sous sa forme unique', () => {
    const member = Member.register({ email: 'tojo@example.org', name: 'Tojo', phone: '034 12 345 67' })
    expect(member.phone).toBe('+261341234567')
  })

  it('accepte un membre sans numéro', () => {
    expect(registered().phone).toBeNull()
  })

  it('refuse un numéro qui n’est pas valide', () => {
    expect(() => Member.register({ email: 'x@example.org', name: 'X', phone: '12345' })).toThrow()
  })
})

describe('la suspension', () => {
  it('empêche un membre suspendu de publier, avec un motif lisible', () => {
    const member = registered()
    member.suspend('Annonces en double, à répétition')
    expect(member.status).toBe('SUSPENDED')
    expect(member.canPost()).toBe(false)
    expect(member.suspensionReason).toContain('double')
  })

  it('refuse une suspension sans motif', () => {
    expect(() => registered().suspend('  ')).toThrow()
  })

  it('rend ses droits à un membre réintégré', () => {
    const member = registered()
    member.suspend('Signalé par erreur')
    member.reinstate()
    expect(member.status).toBe('ACTIVE')
    expect(member.canPost()).toBe(true)
  })
})

describe('stockage des mots de passe', () => {
  it('ne conserve jamais le mot de passe en clair', async () => {
    const hash = await hashPassword('mot-de-passe-de-test-1')
    expect(hash).not.toContain('mot-de-passe-de-test-1')
    expect(hash.length).toBeGreaterThan(20)
  })

  // Un hachage sans sel se casse avec une table pré-calculée.
  it('sale le hachage : deux hachages du même mot de passe diffèrent', async () => {
    const [first, second] = await Promise.all([
      hashPassword('mot-de-passe-de-test-1'),
      hashPassword('mot-de-passe-de-test-1'),
    ])
    expect(first).not.toBe(second)
  })

  it('reconnaît le bon mot de passe et rejette le mauvais', async () => {
    const hash = await hashPassword('mot-de-passe-de-test-1')
    expect(await verifyPassword('mot-de-passe-de-test-1', hash)).toBe(true)
    expect(await verifyPassword('mot-de-passe-de-test-2', hash)).toBe(false)
  })
})

describe('autorisation côté serveur', () => {
  it('refuse un visiteur anonyme avec 401', () => {
    for (const action of ALL_ACTIONS) {
      const decision = authorize({ roles: [], action, isOwner: true })
      expect(decision.allowed, `un visiteur ne doit pas pouvoir ${action}`).toBe(false)
      expect(decision.status).toBe(401)
    }
  })

  it('laisse un membre actif publier, faire une offre, écrire et modifier son profil', () => {
    for (const action of MEMBER_ACTIONS) {
      const decision = authorize({ roles: ['MEMBER'], memberStatus: 'ACTIVE', action })
      expect(decision.allowed, `un membre actif doit pouvoir ${action}`).toBe(true)
    }
  })

  // Le cœur du module : être connecté ne suffit pas, il faut être le vendeur.
  it('laisse un membre modifier son annonce, et refuse celle d’un autre avec 403', () => {
    expect(authorize({ roles: ['MEMBER'], action: 'EDIT_LISTING', isOwner: true }).allowed).toBe(true)

    const other = authorize({ roles: ['MEMBER'], action: 'EDIT_LISTING', isOwner: false })
    expect(other.allowed).toBe(false)
    expect(other.status).toBe(403)

    const unknown = authorize({ roles: ['MEMBER'], action: 'EDIT_LISTING' })
    expect(unknown.allowed, 'sans isOwner, l’annonce n’est pas à lui').toBe(false)
  })

  it('refuse la modération à un simple membre avec 403', () => {
    const decision = authorize({ roles: ['MEMBER'], action: 'MODERATE' })
    expect(decision.allowed).toBe(false)
    expect(decision.status).toBe(403)
  })

  it('refuse tout sauf le profil à un membre suspendu, avec 403', () => {
    for (const action of ['POST_LISTING', 'MAKE_OFFER', 'SEND_MESSAGE'] as const) {
      const decision = authorize({ roles: ['MEMBER'], memberStatus: 'SUSPENDED', action })
      expect(decision.allowed, `un membre suspendu ne doit pas pouvoir ${action}`).toBe(false)
      expect(decision.status).toBe(403)
    }
    const own = authorize({ roles: ['MEMBER'], memberStatus: 'SUSPENDED', action: 'EDIT_LISTING', isOwner: true })
    expect(own.allowed, 'un membre suspendu ne modifie plus ses annonces').toBe(false)
    expect(own.status).toBe(403)
  })

  it('laisse un membre suspendu corriger son profil', () => {
    const decision = authorize({ roles: ['MEMBER'], memberStatus: 'SUSPENDED', action: 'EDIT_PROFILE' })
    expect(decision.allowed).toBe(true)
  })
})

describe('un compte, deux rôles', () => {
  it('laisse un membre modérateur actif modérer et publier', () => {
    for (const action of [...MEMBER_ACTIONS, 'MODERATE'] as const) {
      const decision = authorize({ roles: ['MEMBER', 'MODERATOR'], memberStatus: 'ACTIVE', action })
      expect(decision.allowed, `un membre modérateur doit pouvoir ${action}`).toBe(true)
    }
  })

  it('ne laisse pas un modérateur modifier l’annonce d’un autre', () => {
    const decision = authorize({ roles: ['MEMBER', 'MODERATOR'], action: 'EDIT_LISTING', isOwner: false })
    expect(decision.allowed, 'la modération passe par MODERATE, pas par EDIT_LISTING').toBe(false)
    expect(decision.status).toBe(403)
  })

  it('refuse à un compte modérateur seul de publier', () => {
    const decision = authorize({ roles: ['MODERATOR'], action: 'POST_LISTING' })
    expect(decision.allowed).toBe(false)
    expect(decision.status).toBe(403)
  })

  it('retire la modération à un modérateur suspendu', () => {
    const decision = authorize({ roles: ['MEMBER', 'MODERATOR'], memberStatus: 'SUSPENDED', action: 'MODERATE' })
    expect(decision.allowed).toBe(false)
    expect(decision.status).toBe(403)
  })
})
