/**
 * Module 6 : L'annonce et ses photos.
 *
 * Contrat attendu, exporté par `src/academie/module-6.ts` :
 *
 *   export function createMember(input?: {
 *     name?: string                     // par défaut 'Membre'
 *     email?: string                    // par défaut un courriel inventé
 *     phone?: string                    // facultatif
 *   }): Promise<string>                 // l'identifiant d'un membre actif
 *
 *   export function categories(): Promise<
 *     { slug: string; name: string; parent: string | null }[]   // parent : un slug
 *   >
 *
 *   export function createListing(input: {
 *     sellerId: string
 *     title: string; description: string
 *     category: string                  // le slug d'une sous-catégorie
 *     priceKind: string; price: number | null
 *     city: string
 *   }): Promise<{ status: number; listingId?: string; reason?: string }>   // 201, ou 400
 *
 *   export function updateListing(input: {
 *     listingId: string; memberId: string
 *     title?: string; description?: string
 *     priceKind?: string; price?: number | null
 *   }): Promise<{ status: number }>     // 200; 400 hors des règles; 403 pour un autre membre
 *
 *   export function getListing(listingId: string): Promise<null | {
 *     listingId: string; title: string; description: string
 *     category: string; priceKind: string; price: number | null
 *     city: string; status: string
 *     sellerName: string                // le prénom du vendeur, rien d'autre
 *   }>                                  // null si l'annonce n'existe pas ou est retirée
 *
 *   export function createUploadUrl(input: {
 *     memberId: string; listingId: string; contentType: string; sizeBytes: number
 *   }): Promise<
 *     | { url: string; key: string; expiresAt: string }   // ISO 8601
 *     | { refused: string }                               // motif lisible
 *   >
 *
 *   export function attachPhoto(input: {
 *     memberId: string; listingId: string; key: string
 *   }): Promise<{ attached: boolean; reason?: string }>
 *
 *   export function listPhotos(listingId: string): Promise<
 *     { key: string; position: number; isMain: boolean }[]
 *   >
 *
 *   export function setMainPhoto(input: {
 *     memberId: string; listingId: string; key: string
 *   }): Promise<{ status: number }>     // 200, ou 403 pour un autre membre
 *
 *   export function removeListing(input: {
 *     listingId: string; memberId: string
 *   }): Promise<{ status: number }>     // 200, ou 403 pour un autre membre
 *
 * Règles imposées par la consigne, que cette suite vérifie :
 *   - un titre fait de 5 à 80 caractères, une description 4 000 au plus;
 *   - une annonce se range dans une sous-catégorie existante (décision 0001);
 *   - le prix suit les règles du module 2 (décision 0002), et la ville est
 *     obligatoire;
 *   - seul le vendeur modifie son annonce, y ajoute des photos ou la retire;
 *   - seuls `image/jpeg`, `image/png` et `image/webp` sont acceptés, un fichier
 *     de plus de 10 000 000 octets est refusé, et l'URL de téléversement
 *     expire dans les deux heures;
 *   - une annonce a dix photos au plus, dont exactement une principale;
 *   - une annonce retirée n'est plus visible, et perd ses photos;
 *   - la fiche publique ne montre ni le courriel ni le téléphone du vendeur.
 *
 * Les photos passent par votre port « stockage » : en local et dans ces
 * vérifications, un stockage simulé qui écrit sur le disque; en production,
 * Supabase Storage. Ces vérifications n'envoient aucun fichier : `attachPhoto`
 * n'a pas à vérifier que le fichier a bien été téléversé.
 *
 * Chaque test crée ses propres vendeurs, et trois annonces au plus par
 * vendeur : le quota du module 10 n'y change rien.
 */
import { describe, expect, it } from 'vitest'
import {
  attachPhoto,
  categories,
  createListing,
  createMember,
  createUploadUrl,
  getListing,
  listPhotos,
  removeListing,
  setMainPhoto,
  updateListing,
} from '../../../src/academie/module-6'

const maxBytes = 10_000_000

function valid(sellerId: string) {
  return {
    sellerId,
    title: 'Scooter 125 cm³, très bon état',
    description: 'Acheté en 2022, entretenu chez le même garagiste. Deux casques fournis.',
    category: 'motos',
    priceKind: 'NEGOTIABLE',
    price: 3_200_000,
    city: 'Antananarivo',
  }
}

async function listingOf(sellerId: string) {
  const result = await createListing(valid(sellerId))
  if (!result.listingId) throw new Error(`annonce refusée : ${result.reason ?? result.status}`)
  return result.listingId
}

async function grantFor(memberId: string, listingId: string) {
  const grant = await createUploadUrl({ memberId, listingId, contentType: 'image/jpeg', sizeBytes: 250_000 })
  if (!('key' in grant)) throw new Error(`téléversement refusé : ${grant.refused}`)
  return grant
}

async function listingWithPhotos(count: number) {
  const sellerId = await createMember()
  const listingId = await listingOf(sellerId)
  for (let index = 0; index < count; index += 1) {
    const grant = await grantFor(sellerId, listingId)
    const result = await attachPhoto({ memberId: sellerId, listingId, key: grant.key })
    if (!result.attached) throw new Error(`photo refusée : ${result.reason}`)
  }
  return { sellerId, listingId }
}

describe('les catégories', () => {
  it('forment l’arbre de la décision 0001', async () => {
    const all = await categories()
    const parentOf = new Map(all.map((category) => [category.slug, category.parent]))
    const tree: Record<string, string[]> = {
      vehicules: ['voitures', 'motos'],
      immobilier: ['locations', 'ventes-immobilieres'],
      electronique: ['telephones', 'ordinateurs'],
      maison: ['meubles', 'electromenager'],
    }
    for (const [parent, children] of Object.entries(tree)) {
      expect(parentOf.get(parent), `« ${parent} » est une catégorie principale`).toBeNull()
      for (const child of children) {
        expect(parentOf.get(child), `« ${child} » se range sous « ${parent} »`).toBe(parent)
      }
    }
    expect(all.every((category) => category.name.trim().length > 0), 'chaque catégorie a un nom').toBe(true)
  })
})

describe('la publication d’une annonce', () => {
  it('crée une annonce en ligne, que tout le monde peut lire', async () => {
    const sellerId = await createMember({ name: 'Tojo' })
    const result = await createListing(valid(sellerId))
    expect(result.status).toBe(201)
    expect(result.listingId, 'une annonce créée porte un identifiant').toBeTruthy()

    const listing = await getListing(result.listingId ?? '')
    expect(listing).toMatchObject({
      title: 'Scooter 125 cm³, très bon état',
      category: 'motos',
      priceKind: 'NEGOTIABLE',
      price: 3_200_000,
      city: 'Antananarivo',
      status: 'ACTIVE',
      sellerName: 'Tojo',
    })
  })

  it('refuse un titre trop court ou trop long, et une description trop longue, avec 400', async () => {
    const sellerId = await createMember()
    expect((await createListing({ ...valid(sellerId), title: 'Vélo' })).status).toBe(400)
    expect((await createListing({ ...valid(sellerId), title: 'a'.repeat(81) })).status).toBe(400)
    expect((await createListing({ ...valid(sellerId), description: 'a'.repeat(4_001) })).status).toBe(400)
  })

  it('refuse une catégorie inconnue, ou une catégorie principale, avec 400', async () => {
    const sellerId = await createMember()
    const unknown = await createListing({ ...valid(sellerId), category: 'bijoux-anciens' })
    expect(unknown.status).toBe(400)
    expect(unknown.reason, 'le refus doit porter un motif lisible').toBeTruthy()
    expect((await createListing({ ...valid(sellerId), category: 'vehicules' })).status).toBe(400)
  })

  it('refuse un prix invalide ou une ville vide, avec 400', async () => {
    const sellerId = await createMember()
    expect((await createListing({ ...valid(sellerId), priceKind: 'FIXED', price: 0 })).status).toBe(400)
    expect((await createListing({ ...valid(sellerId), priceKind: 'FIXED', price: 12.5 })).status).toBe(400)
    expect((await createListing({ ...valid(sellerId), city: '  ' })).status).toBe(400)
  })

  it('accepte une annonce gratuite et un échange', async () => {
    const sellerId = await createMember()
    expect((await createListing({ ...valid(sellerId), priceKind: 'FREE', price: 0 })).status).toBe(201)
    expect((await createListing({ ...valid(sellerId), priceKind: 'SWAP', price: null })).status).toBe(201)
  })

  // Les acheteurs écrivent par la messagerie : le vendeur reste joignable sans s'exposer.
  it('ne montre jamais le courriel ni le téléphone du vendeur', async () => {
    const email = `vendeur-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.org`
    const sellerId = await createMember({ name: 'Voahangy', email, phone: '034 98 765 43' })
    const listing = await getListing(await listingOf(sellerId))

    const text = JSON.stringify(listing)
    expect(Object.keys(listing ?? {}).join(' '), 'aucune donnée de contact dans une fiche').not.toMatch(
      /email|courriel|phone|telephone|mail/i,
    )
    expect(text, 'le courriel du vendeur reste sur le serveur').not.toContain(email)
    expect(text, 'le téléphone du vendeur reste sur le serveur').not.toMatch(/98\s?765\s?43|987654/)
  })
})

describe('la modification d’une annonce', () => {
  it('laisse le vendeur changer son titre et son prix', async () => {
    const sellerId = await createMember()
    const listingId = await listingOf(sellerId)
    const result = await updateListing({
      listingId,
      memberId: sellerId,
      title: 'Scooter 125 cm³, prix en baisse',
      priceKind: 'FIXED',
      price: 2_900_000,
    })

    expect(result.status).toBe(200)
    expect(await getListing(listingId)).toMatchObject({
      title: 'Scooter 125 cm³, prix en baisse',
      priceKind: 'FIXED',
      price: 2_900_000,
    })
  })

  // Côté serveur : connaître l'identifiant d'une annonce ne suffit pas à la modifier.
  it('refuse à un autre membre de modifier l’annonce, avec 403', async () => {
    const listingId = await listingOf(await createMember())
    const stranger = await createMember()

    expect((await updateListing({ listingId, memberId: stranger, title: 'Annonce détournée' })).status).toBe(403)
    expect((await getListing(listingId))?.title).toBe('Scooter 125 cm³, très bon état')
  })

  it('refuse une modification hors des règles, avec 400', async () => {
    const sellerId = await createMember()
    const listingId = await listingOf(sellerId)
    expect((await updateListing({ listingId, memberId: sellerId, priceKind: 'SWAP', price: 5_000 })).status).toBe(400)
    expect((await getListing(listingId))?.price).toBe(3_200_000)
  })
})

describe('autorisation de téléversement', () => {
  it('accorde une URL signée au vendeur, qui expire dans les deux heures', async () => {
    const sellerId = await createMember()
    const listingId = await listingOf(sellerId)
    const grant = await createUploadUrl({ memberId: sellerId, listingId, contentType: 'image/webp', sizeBytes: 250_000 })

    expect('key' in grant, 'une image valide doit être acceptée').toBe(true)
    if (!('key' in grant)) return
    expect(grant.url).toMatch(/^https?:\/\/.+/)
    const expiresAt = new Date(grant.expiresAt).getTime()
    expect(Number.isNaN(expiresAt), 'expiresAt doit être une date ISO 8601').toBe(false)
    expect(expiresAt).toBeGreaterThan(Date.now())
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 7_200_000)
  })

  // Le type est décidé côté serveur : un client peut annoncer ce qu'il veut.
  it('refuse un fichier qui n’est pas une image, ou trop volumineux', async () => {
    const sellerId = await createMember()
    const listingId = await listingOf(sellerId)
    for (const contentType of ['application/pdf', 'text/html', 'video/mp4']) {
      const grant = await createUploadUrl({ memberId: sellerId, listingId, contentType, sizeBytes: 100_000 })
      expect('refused' in grant, `${contentType} doit être refusé`).toBe(true)
    }
    const big = await createUploadUrl({ memberId: sellerId, listingId, contentType: 'image/jpeg', sizeBytes: maxBytes + 1 })
    expect('refused' in big, 'un fichier de plus de 10 Mo doit être refusé').toBe(true)
  })

  it('refuse le téléversement à un autre membre que le vendeur', async () => {
    const listingId = await listingOf(await createMember())
    const stranger = await createMember()
    const grant = await createUploadUrl({ memberId: stranger, listingId, contentType: 'image/jpeg', sizeBytes: 100_000 })
    expect('refused' in grant, 'seul le vendeur ajoute des photos à son annonce').toBe(true)
  })
})

describe('les photos d’une annonce', () => {
  it('conserve les photos à des positions distinctes, avec exactement une principale', async () => {
    const { listingId } = await listingWithPhotos(3)
    const photos = await listPhotos(listingId)

    expect(photos).toHaveLength(3)
    expect(new Set(photos.map((photo) => photo.position)).size).toBe(3)
    expect(photos.filter((photo) => photo.isMain)).toHaveLength(1)
  })

  it('change de photo principale sans en créer une seconde', async () => {
    const { sellerId, listingId } = await listingWithPhotos(3)
    const target = (await listPhotos(listingId)).find((photo) => !photo.isMain)
    expect(target, 'il faut au moins une photo secondaire').toBeDefined()
    if (!target) return

    expect((await setMainPhoto({ memberId: sellerId, listingId, key: target.key })).status).toBe(200)
    const after = await listPhotos(listingId)
    expect(after.filter((photo) => photo.isMain)).toHaveLength(1)
    expect(after.find((photo) => photo.isMain)?.key).toBe(target.key)
  })

  it('refuse à un autre membre de changer la photo principale, avec 403', async () => {
    const { listingId } = await listingWithPhotos(2)
    const target = (await listPhotos(listingId)).find((photo) => !photo.isMain)
    const stranger = await createMember()
    expect((await setMainPhoto({ memberId: stranger, listingId, key: target?.key ?? '' })).status).toBe(403)
  })

  it('refuse une onzième photo, avec un motif', { timeout: 30_000 }, async () => {
    const { sellerId, listingId } = await listingWithPhotos(10)
    const grant = await createUploadUrl({ memberId: sellerId, listingId, contentType: 'image/jpeg', sizeBytes: 250_000 })
    const result =
      'key' in grant
        ? await attachPhoto({ memberId: sellerId, listingId, key: grant.key })
        : { attached: false, reason: grant.refused }

    expect(result.attached, 'dix photos au plus').toBe(false)
    expect(result.reason, 'le refus doit porter un motif lisible').toBeTruthy()
    expect(await listPhotos(listingId)).toHaveLength(10)
  })

  it('refuse de reprendre la photo d’une autre annonce', async () => {
    const owner = await listingWithPhotos(1)
    const thiefId = await createMember()
    const thiefListing = await listingOf(thiefId)
    const [photo] = await listPhotos(owner.listingId)
    expect(photo).toBeDefined()

    const result = await attachPhoto({ memberId: thiefId, listingId: thiefListing, key: photo?.key ?? '' })
    expect(result.attached, 'une photo déjà rattachée ne doit pas être reprise').toBe(false)
  })
})

describe('le retrait d’une annonce', () => {
  it('cache l’annonce retirée par son vendeur, et efface ses photos', async () => {
    const { sellerId, listingId } = await listingWithPhotos(2)

    expect((await removeListing({ listingId, memberId: sellerId })).status).toBe(200)
    expect(await getListing(listingId), 'une annonce retirée n’est plus visible').toBeNull()
    expect(await listPhotos(listingId), 'les photos d’une annonce retirée sont effacées').toEqual([])
  })

  it('refuse le retrait à un autre membre, avec 403', async () => {
    const listingId = await listingOf(await createMember())
    const stranger = await createMember()

    expect((await removeListing({ listingId, memberId: stranger })).status).toBe(403)
    expect((await getListing(listingId))?.status).toBe('ACTIVE')
  })
})
