/**
 * Module 13 : La messagerie en temps réel, et le blocage.
 *
 * Un acheteur écrit au vendeur à propos d'une annonce, et un message envoyé
 * apparaît chez l'autre sans recharger la page. Personne ne voit le courriel
 * ni le téléphone de l'autre : la messagerie du site remplace l'échange de
 * numéros, et c'est ce qui protège les vendeurs du démarchage. Deux règles font
 * la différence entre une messagerie et une fuite de données :
 *
 * - seuls l'acheteur et le vendeur lisent leur conversation, et le serveur le
 *   vérifie à chaque lecture, à chaque envoi et à chaque abonnement;
 * - un blocage ferme toutes les conversations entre les deux membres. Le
 *   membre bloqué ne peut plus écrire à celui qui l'a bloqué, ni lui faire
 *   d'offre.
 *
 * Contrat attendu, exporté par `src/academie/module-13.ts` :
 *
 *   export function createMember(input?: { name?: string }): Promise<string>
 *   export function createListing(input?: { ...ceux du module 7 }): Promise<string>
 *   export function makeOffer(input: { listingId; buyerId; amount })      // module 9
 *   export function removeListing(input: { listingId; memberId })         // module 6
 *
 *   export function startConversation(input: {
 *     listingId: string; buyerId: string
 *   }): Promise<{
 *     status: number               // 201, ou 200 si elle existe déjà;
 *                                  // 400 sur sa propre annonce; 403 si le vendeur
 *                                  // a bloqué l'acheteur; 409 si l'annonce est retirée
 *     conversationId?: string      // la même pour le même acheteur et la même annonce
 *   }>
 *
 *   export function sendMessage(input: {
 *     conversationId: string; senderId: string; body: string
 *   }): Promise<{ status: number }>              // 201, 400 ou 403
 *
 *   export function readConversation(input: {
 *     conversationId: string; readerId: string
 *   }): Promise<{
 *     status: number
 *     messages: { senderId: string; body: string; read: boolean }[]
 *   }>                          // read : le destinataire a lu ce message
 *
 *   export function markRead(input: {
 *     conversationId: string; readerId: string
 *   }): Promise<{ status: number }>   // 200; 403 pour un tiers
 *                                     // marque lus les messages reçus de l'autre
 *
 *   export function unreadCount(memberId: string): Promise<number>
 *                             // messages reçus et pas encore lus, dans les conversations ouvertes
 *
 *   export function listConversations(memberId: string): Promise<
 *     { conversationId: string; listingId: string; otherId: string; unread: number }[]
 *   >                         // les conversations ouvertes, où le membre est acheteur ou vendeur
 *
 *   export function subscribe(input: {
 *     conversationId: string; readerId: string
 *     onMessage: (message: { senderId: string; body: string }) => void
 *   }): Promise<{ status: number; unsubscribe: () => void }>
 *
 *   export function block(input: {
 *     blockerId: string; blockedId: string
 *   }): Promise<{ status: number }>              // 200 ou 201; 400 pour soi-même
 *
 * Un tiers reçoit 403 et aucun message; un abonnement refusé rend quand même
 * une fonction `unsubscribe`, qui ne fait rien. Un message vide, ou de plus de
 * 1 000 caractères, reçoit 400. Après un blocage, dans un sens ou dans l'autre,
 * la lecture et l'envoi répondent 403 aux deux membres, et la conversation
 * disparaît de leurs listes.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  block,
  createListing,
  createMember,
  listConversations,
  makeOffer,
  markRead,
  readConversation,
  removeListing,
  sendMessage,
  startConversation,
  subscribe,
  unreadCount,
} from '../../../src/academie/module-13'

let strangerId = ''

beforeAll(async () => {
  strangerId = await createMember()
})

const cleanups: (() => void)[] = []
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
})

/** Un vendeur, son annonce, un acheteur, et la conversation ouverte par l'acheteur. */
async function conversation() {
  const sellerId = await createMember({ name: 'Vendeur' })
  const listingId = await createListing({ sellerId })
  const buyerId = await createMember({ name: 'Acheteur' })
  const started = await startConversation({ listingId, buyerId })
  if (!started.conversationId) throw new Error(`conversation refusée : ${started.status}`)
  return { sellerId, listingId, buyerId, conversationId: started.conversationId }
}

/** Attend un message diffusé, ou échoue au bout de trois secondes. */
function nextMessage(conversationId: string, readerId: string) {
  return new Promise<{ senderId: string; body: string }>((resolveMessage, reject) => {
    const timer = setTimeout(() => reject(new Error('aucun message reçu en 3 s')), 3_000)
    void subscribe({
      conversationId,
      readerId,
      onMessage: (message) => {
        clearTimeout(timer)
        resolveMessage(message)
      },
    }).then((subscription) => cleanups.push(subscription.unsubscribe))
  })
}

describe('ouvrir une conversation', () => {
  it('ouvre une seule conversation par acheteur et par annonce', async () => {
    const sellerId = await createMember()
    const listingId = await createListing({ sellerId })
    const buyerId = await createMember()

    const first = await startConversation({ listingId, buyerId })
    const again = await startConversation({ listingId, buyerId })
    expect(first.status).toBe(201)
    expect(again.status).toBe(200)
    expect(again.conversationId).toBe(first.conversationId)
  })

  it('refuse d’écrire à propos de sa propre annonce, avec 400', async () => {
    const sellerId = await createMember()
    const listingId = await createListing({ sellerId })
    expect((await startConversation({ listingId, buyerId: sellerId })).status).toBe(400)
  })

  it('refuse une conversation sur une annonce retirée, avec 409', async () => {
    const sellerId = await createMember()
    const listingId = await createListing({ sellerId })
    await removeListing({ listingId, memberId: sellerId })
    expect((await startConversation({ listingId, buyerId: await createMember() })).status).toBe(409)
  })
})

describe('entre l’acheteur et le vendeur', () => {
  it('rend les messages aux deux, dans l’ordre d’envoi', async () => {
    const { conversationId, buyerId, sellerId } = await conversation()
    expect((await sendMessage({ conversationId, senderId: buyerId, body: 'Toujours disponible ?' })).status).toBe(201)
    await sendMessage({ conversationId, senderId: sellerId, body: 'Oui, passez ce soir.' })

    for (const readerId of [buyerId, sellerId]) {
      const result = await readConversation({ conversationId, readerId })
      expect(result.status).toBe(200)
      expect(result.messages.map((message) => message.body)).toEqual(['Toujours disponible ?', 'Oui, passez ce soir.'])
      expect(result.messages.map((message) => message.senderId)).toEqual([buyerId, sellerId])
    }
  })

  it('refuse un message vide, ou trop long, avec 400', async () => {
    const { conversationId, buyerId } = await conversation()
    expect((await sendMessage({ conversationId, senderId: buyerId, body: '   ' })).status).toBe(400)
    expect((await sendMessage({ conversationId, senderId: buyerId, body: 'a'.repeat(1_001) })).status).toBe(400)
    expect((await readConversation({ conversationId, readerId: buyerId })).messages).toEqual([])
  })

  it('range la conversation dans la liste des deux, avec l’autre membre et l’annonce', async () => {
    const { conversationId, listingId, buyerId, sellerId } = await conversation()
    await sendMessage({ conversationId, senderId: buyerId, body: 'Bonjour' })

    expect(await listConversations(sellerId)).toEqual([{ conversationId, listingId, otherId: buyerId, unread: 1 }])
    expect(await listConversations(buyerId)).toEqual([{ conversationId, listingId, otherId: sellerId, unread: 0 }])
  })
})

describe('fermée aux tiers', () => {
  it('refuse la lecture à un tiers avec 403, sans rien lui rendre', async () => {
    const { conversationId, buyerId } = await conversation()
    await sendMessage({ conversationId, senderId: buyerId, body: 'Mon adresse est…' })

    const result = await readConversation({ conversationId, readerId: strangerId })
    expect(result.status).toBe(403)
    expect(result.messages).toEqual([])
  })

  it('refuse l’envoi à un tiers avec 403', async () => {
    const { conversationId, buyerId } = await conversation()
    expect((await sendMessage({ conversationId, senderId: strangerId, body: 'Intrus' })).status).toBe(403)
    expect((await readConversation({ conversationId, readerId: buyerId })).messages).toEqual([])
  })

  it('refuse l’abonnement en temps réel à un tiers', async () => {
    const { conversationId } = await conversation()
    const subscription = await subscribe({ conversationId, readerId: strangerId, onMessage: () => undefined })
    cleanups.push(subscription.unsubscribe)
    expect(subscription.status).toBe(403)
  })
})

describe('en temps réel', () => {
  it('diffuse un message à l’autre membre dès son envoi', async () => {
    const { conversationId, buyerId, sellerId } = await conversation()
    const received = nextMessage(conversationId, sellerId)
    await new Promise((resolveWait) => setTimeout(resolveWait, 100))

    await sendMessage({ conversationId, senderId: buyerId, body: 'Je peux passer samedi ?' })
    expect((await received).body).toBe('Je peux passer samedi ?')
  })
})

describe('le blocage', () => {
  it('ferme la conversation pour les deux, et la retire de leurs listes', async () => {
    const { conversationId, buyerId, sellerId } = await conversation()
    await sendMessage({ conversationId, senderId: buyerId, body: 'Dernier prix ?' })
    expect([200, 201]).toContain((await block({ blockerId: sellerId, blockedId: buyerId })).status)

    for (const memberId of [buyerId, sellerId]) {
      expect((await sendMessage({ conversationId, senderId: memberId, body: 'Encore là ?' })).status).toBe(403)
      const read = await readConversation({ conversationId, readerId: memberId })
      expect(read.status).toBe(403)
      expect(read.messages).toEqual([])
      expect(await listConversations(memberId)).toEqual([])
    }
  })

  it('empêche le membre bloqué d’écrire au sujet d’une autre annonce, ou de faire une offre', async () => {
    const sellerId = await createMember()
    const buyerId = await createMember()
    const listingId = await createListing({ sellerId })
    await block({ blockerId: sellerId, blockedId: buyerId })

    expect((await startConversation({ listingId, buyerId })).status).toBe(403)
    const offer = await makeOffer({ listingId, buyerId, amount: 5_000 })
    expect(offer.accepted).toBe(false)
    expect(offer.reason, 'le refus doit porter un motif lisible').toBeTruthy()
  })

  it('vaut dans les deux sens', async () => {
    const sellerId = await createMember()
    const buyerId = await createMember()
    const listingId = await createListing({ sellerId })
    await block({ blockerId: buyerId, blockedId: sellerId })

    expect((await startConversation({ listingId, buyerId })).status).toBe(403)
  })

  it('refuse de se bloquer soi-même, et accepte un second blocage sans erreur', async () => {
    const blocker = await createMember()
    const blocked = await createMember()

    expect((await block({ blockerId: blocker, blockedId: blocker })).status).toBe(400)
    await block({ blockerId: blocker, blockedId: blocked })
    expect([200, 201]).toContain((await block({ blockerId: blocker, blockedId: blocked })).status)
  })
})

describe('les messages non lus et l’accusé de lecture', () => {
  it('compte les messages non lus du destinataire, pas ceux de l’auteur', async () => {
    const { conversationId, buyerId, sellerId } = await conversation()
    await sendMessage({ conversationId, senderId: buyerId, body: 'Bonjour' })
    await sendMessage({ conversationId, senderId: buyerId, body: 'Vous êtes là ?' })

    expect(await unreadCount(sellerId)).toBe(2)
    expect(await unreadCount(buyerId)).toBe(0)
  })

  it('remet le compteur à zéro quand le destinataire lit, et le montre à l’auteur', async () => {
    const { conversationId, buyerId, sellerId } = await conversation()
    await sendMessage({ conversationId, senderId: buyerId, body: 'Bonjour' })
    expect((await readConversation({ conversationId, readerId: buyerId })).messages[0]?.read).toBe(false)

    expect((await markRead({ conversationId, readerId: sellerId })).status).toBe(200)
    expect(await unreadCount(sellerId)).toBe(0)
    expect(
      (await readConversation({ conversationId, readerId: buyerId })).messages[0]?.read,
      'l’auteur voit que son message a été lu',
    ).toBe(true)
  })

  it('ne marque pas lus les messages de celui qui lit', async () => {
    const { conversationId, buyerId, sellerId } = await conversation()
    await sendMessage({ conversationId, senderId: buyerId, body: 'Bonjour' })
    await markRead({ conversationId, readerId: buyerId })

    expect(await unreadCount(sellerId)).toBe(1)
  })

  it('refuse à un tiers de marquer une conversation comme lue, avec 403', async () => {
    const { conversationId } = await conversation()
    expect((await markRead({ conversationId, readerId: strangerId })).status).toBe(403)
  })

  it('ne compte plus les messages d’une conversation fermée par un blocage', async () => {
    const { conversationId, buyerId, sellerId } = await conversation()
    await sendMessage({ conversationId, senderId: buyerId, body: 'Bonjour' })
    await block({ blockerId: sellerId, blockedId: buyerId })

    expect(await unreadCount(sellerId)).toBe(0)
  })
})
