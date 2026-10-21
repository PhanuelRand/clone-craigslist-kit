/**
 * Module 16 : Signalements et modération. Module Platine.
 *
 * Comme sur Craigslist, ce sont les membres qui signalent les annonces
 * douteuses : une arnaque, un objet interdit, une mauvaise catégorie, un
 * doublon. Celui qui signale ne voit plus l'annonce. Les signalements
 * s'agrègent, et quand assez de personnes différentes signalent la même
 * annonce, elle est masquée pour tous en attendant la modération.
 *
 * Barème imposé, calculé sur les signalements d'une même annonce. Un
 * signalement compte s'il a trente jours ou moins à la date `now`; un
 * signalement daté après `now` ne compte pas.
 *
 *   deux auteurs différents ou plus pour SCAM ou PROHIBITED   -> HIDE
 *   trois auteurs différents ou plus, tous motifs confondus   -> HIDE
 *   au moins un signalement qui compte                        -> REVIEW
 *   sinon                                                     -> NONE
 *
 * Plusieurs signalements du même auteur comptent pour un seul auteur.
 *
 * Contrat attendu, exporté par `src/academie/module-16.ts` :
 *
 *   export type ReportReason =
 *     'SCAM' | 'PROHIBITED' | 'WRONG_CATEGORY' | 'DUPLICATE' | 'OFFENSIVE' | 'OTHER'
 *
 *   export function moderationFor(input: {
 *     reports: { reporterId: string; reason: ReportReason; at: string }[]  // 'AAAA-MM-JJ'
 *     now: string                                                          // 'AAAA-MM-JJ'
 *   }): { action: 'NONE' | 'REVIEW' | 'HIDE' }
 *
 *   export function createMember(input?: {
 *     name?: string
 *     roles?: ('MEMBER' | 'MODERATOR')[]      // par défaut ['MEMBER']
 *   }): Promise<string>
 *   export function createListing(input?: { ...ceux du module 7 }): Promise<string>
 *   export function getListing(listingId: string)                     // module 6
 *   export function search(input: {
 *     ...ceux du module 7
 *     viewerId?: string                       // le membre connecté, s'il y en a un
 *   })
 *
 *   export function report(input: {
 *     reporterId: string; listingId: string
 *     reason: string; comment: string
 *     at: string                              // 'AAAA-MM-JJ'
 *   }): Promise<{ status: number }>           // 201; 400 pour sa propre annonce ou un motif inconnu
 *
 *   export function moderationQueue(input: {
 *     moderatorId: string; now: string
 *   }): Promise<{
 *     status: number                          // 200, ou 403 sans le rôle MODERATOR
 *     items: { listingId: string; action: 'REVIEW' | 'HIDE' }[]
 *   }>
 *
 *   export function restoreListing(input: {
 *     moderatorId: string; listingId: string
 *   }): Promise<{ status: number }>           // 200, ou 403 sans le rôle MODERATOR
 *
 *   export function removeByModeration(input: {
 *     moderatorId: string; listingId: string; reason: string
 *   }): Promise<{ status: number }>           // 200, ou 403 sans le rôle MODERATOR
 *
 * Quand un signalement fait passer une annonce à HIDE, elle est masquée
 * aussitôt : elle disparaît de la recherche de tous, et sa fiche publique rend
 * `null`. Un modérateur la rétablit, ce qui classe les signalements reçus, ou
 * la retire définitivement.
 */
import { describe, expect, it } from 'vitest'
import {
  createListing,
  createMember,
  getListing,
  moderationFor,
  moderationQueue,
  removeByModeration,
  report,
  restoreListing,
  search,
} from '../../../src/academie/module-16'
import { todayInMadagascar } from '../_support/dates'

// Le barème lit les dates des signalements; la recherche, la date du jour.
const now = '2030-07-31'
const today = todayInMadagascar()

type Reason = 'SCAM' | 'PROHIBITED' | 'WRONG_CATEGORY' | 'DUPLICATE' | 'OFFENSIVE' | 'OTHER'

function uniqueCity(label: string) {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function found(city: string, viewerId?: string) {
  return (await search({ city, today, viewerId })).items.map((item) => item.listingId)
}

async function reportedBy(listingId: string, reasons: Reason[]) {
  for (const reason of reasons) {
    await report({ reporterId: await createMember(), listingId, reason, comment: 'Douteux', at: now })
  }
}

describe('le barème de modération', () => {
  const cases: {
    label: string
    reports: { reporterId: string; reason: Reason; at: string }[]
    expected: 'NONE' | 'REVIEW' | 'HIDE'
  }[] = [
    { label: 'aucun signalement', reports: [], expected: 'NONE' },
    {
      label: 'un signalement récent',
      reports: [{ reporterId: 'a', reason: 'DUPLICATE', at: '2030-07-30' }],
      expected: 'REVIEW',
    },
    {
      label: 'un signalement de trente jours tout juste',
      reports: [{ reporterId: 'a', reason: 'OTHER', at: '2030-07-01' }],
      expected: 'REVIEW',
    },
    {
      label: 'un signalement de trente et un jours',
      reports: [{ reporterId: 'a', reason: 'OTHER', at: '2030-06-30' }],
      expected: 'NONE',
    },
    {
      label: 'un signalement daté après aujourd’hui',
      reports: [{ reporterId: 'a', reason: 'OTHER', at: '2030-08-01' }],
      expected: 'NONE',
    },
    {
      label: 'une seule personne qui crie à l’arnaque',
      reports: [{ reporterId: 'a', reason: 'SCAM', at: '2030-07-20' }],
      expected: 'REVIEW',
    },
    {
      label: 'deux auteurs pour une arnaque et un objet interdit',
      reports: [
        { reporterId: 'a', reason: 'SCAM', at: '2030-07-20' },
        { reporterId: 'b', reason: 'PROHIBITED', at: '2030-07-25' },
      ],
      expected: 'HIDE',
    },
    {
      label: 'deux signalements d’arnaque du même auteur',
      reports: [
        { reporterId: 'a', reason: 'SCAM', at: '2030-07-20' },
        { reporterId: 'a', reason: 'SCAM', at: '2030-07-25' },
      ],
      expected: 'REVIEW',
    },
    {
      label: 'deux auteurs pour une arnaque, dont un trop ancien',
      reports: [
        { reporterId: 'a', reason: 'SCAM', at: '2030-06-01' },
        { reporterId: 'b', reason: 'SCAM', at: '2030-07-25' },
      ],
      expected: 'REVIEW',
    },
    {
      label: 'deux auteurs pour une mauvaise catégorie',
      reports: [
        { reporterId: 'a', reason: 'WRONG_CATEGORY', at: '2030-07-20' },
        { reporterId: 'b', reason: 'WRONG_CATEGORY', at: '2030-07-25' },
      ],
      expected: 'REVIEW',
    },
    {
      label: 'trois auteurs, tous motifs confondus',
      reports: [
        { reporterId: 'a', reason: 'WRONG_CATEGORY', at: '2030-07-10' },
        { reporterId: 'b', reason: 'DUPLICATE', at: '2030-07-15' },
        { reporterId: 'c', reason: 'OFFENSIVE', at: '2030-07-29' },
      ],
      expected: 'HIDE',
    },
    {
      label: 'trois signalements du même auteur',
      reports: [
        { reporterId: 'a', reason: 'OTHER', at: '2030-07-10' },
        { reporterId: 'a', reason: 'OTHER', at: '2030-07-15' },
        { reporterId: 'a', reason: 'OTHER', at: '2030-07-29' },
      ],
      expected: 'REVIEW',
    },
    {
      label: 'trois auteurs, dont un signalement trop ancien',
      reports: [
        { reporterId: 'a', reason: 'OTHER', at: '2030-05-01' },
        { reporterId: 'b', reason: 'OTHER', at: '2030-07-15' },
        { reporterId: 'c', reason: 'OTHER', at: '2030-07-29' },
      ],
      expected: 'REVIEW',
    },
  ]

  for (const scenario of cases) {
    it(`${scenario.label} : ${scenario.expected}`, () => {
      expect(moderationFor({ reports: scenario.reports, now }).action).toBe(scenario.expected)
    })
  }
})

describe('le signalement', () => {
  it('accepte un signalement, et refuse de signaler sa propre annonce ou un motif inconnu', async () => {
    const sellerId = await createMember()
    const listingId = await createListing({ sellerId })
    const base = { reporterId: await createMember(), listingId, comment: 'Prix trop beau', at: now }

    expect((await report({ ...base, reason: 'SCAM' })).status).toBe(201)
    expect((await report({ ...base, reporterId: sellerId, reason: 'OTHER' })).status).toBe(400)
    expect((await report({ ...base, reason: 'PAS_SYMPA' })).status).toBe(400)
  })

  it('cache l’annonce à celui qui la signale, et à lui seul', async () => {
    const city = uniqueCity('signalement')
    const listingId = await createListing({ city })
    const reporter = await createMember()
    const witness = await createMember()
    await report({ reporterId: reporter, listingId, reason: 'DUPLICATE', comment: 'Déjà vue', at: now })

    expect(await found(city, reporter)).not.toContain(listingId)
    expect(await found(city, witness), 'les autres la voient toujours').toContain(listingId)
    expect(await found(city), 'un visiteur la voit toujours').toContain(listingId)
  })
})

describe('le masquage automatique', { timeout: 30_000 }, () => {
  it('masque pour tous une annonce signalée comme arnaque par deux personnes', async () => {
    const city = uniqueCity('arnaque')
    const listingId = await createListing({ city })
    await reportedBy(listingId, ['SCAM', 'SCAM'])

    expect(await found(city, await createMember())).not.toContain(listingId)
    expect(await found(city)).not.toContain(listingId)
    expect(await getListing(listingId), 'la fiche d’une annonce masquée n’est plus publique').toBeNull()
  })

  it('masque pour tous une annonce signalée par trois personnes', async () => {
    const city = uniqueCity('trois')
    const listingId = await createListing({ city })
    await reportedBy(listingId, ['OTHER', 'DUPLICATE', 'WRONG_CATEGORY'])

    expect(await found(city)).not.toContain(listingId)
  })

  it('ne masque pas une annonce signalée trois fois par la même personne', async () => {
    const city = uniqueCity('meme-auteur')
    const listingId = await createListing({ city })
    const reporter = await createMember()
    for (let index = 0; index < 3; index += 1) {
      await report({ reporterId: reporter, listingId, reason: 'SCAM', comment: 'Encore', at: now })
    }

    expect(await found(city)).toContain(listingId)
  })
})

describe('la file de modération', { timeout: 30_000 }, () => {
  it('montre au modérateur les annonces à examiner et celles masquées', async () => {
    const moderator = await createMember({ roles: ['MEMBER', 'MODERATOR'] })
    const reviewed = await createListing()
    await reportedBy(reviewed, ['DUPLICATE'])
    const hidden = await createListing()
    await reportedBy(hidden, ['PROHIBITED', 'SCAM'])

    const queue = await moderationQueue({ moderatorId: moderator, now })
    expect(queue.status).toBe(200)
    expect(queue.items).toContainEqual({ listingId: reviewed, action: 'REVIEW' })
    expect(queue.items).toContainEqual({ listingId: hidden, action: 'HIDE' })
  })

  it('refuse la file, le rétablissement et le retrait à un simple membre, avec 403', async () => {
    const member = await createMember()
    const listingId = await createListing()
    const queue = await moderationQueue({ moderatorId: member, now })
    expect(queue.status).toBe(403)
    expect(queue.items).toEqual([])
    expect((await restoreListing({ moderatorId: member, listingId })).status).toBe(403)
    expect((await removeByModeration({ moderatorId: member, listingId, reason: 'Test' })).status).toBe(403)
  })

  it('laisse un modérateur rétablir une annonce masquée, qui quitte la file', async () => {
    const city = uniqueCity('retablie')
    const moderator = await createMember({ roles: ['MEMBER', 'MODERATOR'] })
    const listingId = await createListing({ city })
    await reportedBy(listingId, ['SCAM', 'SCAM'])

    expect((await restoreListing({ moderatorId: moderator, listingId })).status).toBe(200)
    expect(await found(city)).toContain(listingId)
    const queue = await moderationQueue({ moderatorId: moderator, now })
    expect(queue.items.map((item) => item.listingId)).not.toContain(listingId)
  })

  it('laisse un modérateur retirer une annonce, définitivement', async () => {
    const city = uniqueCity('retiree')
    const moderator = await createMember({ roles: ['MEMBER', 'MODERATOR'] })
    const listingId = await createListing({ city })
    await reportedBy(listingId, ['PROHIBITED'])

    expect((await removeByModeration({ moderatorId: moderator, listingId, reason: 'Objet interdit' })).status).toBe(200)
    expect(await getListing(listingId)).toBeNull()
    expect(await found(city)).not.toContain(listingId)
    const queue = await moderationQueue({ moderatorId: moderator, now })
    expect(queue.items.map((item) => item.listingId)).not.toContain(listingId)
  })
})
