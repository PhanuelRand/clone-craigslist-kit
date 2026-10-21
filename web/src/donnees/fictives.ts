/**
 * Des données fictives, pour construire vos écrans avant que l'API existe.
 *
 * Au module 3, vos pages lisent ce fichier. Dans les modules suivants, chaque
 * page le remplace par un appel à votre API, une page à la fois. Quand plus
 * aucun écran ne l'importe, supprimez-le.
 *
 * Les vendeurs, leurs annonces et leurs messages sont inventés.
 */

/** Les catégories du parcours : un arbre à deux niveaux (décision 0001). */
export type CategorieFictive = {
  slug: string
  nom: string
  parent: string | null
}

export const categoriesFictives: CategorieFictive[] = [
  { slug: 'vehicules', nom: 'Véhicules', parent: null },
  { slug: 'voitures', nom: 'Voitures', parent: 'vehicules' },
  { slug: 'motos', nom: 'Motos et scooters', parent: 'vehicules' },
  { slug: 'immobilier', nom: 'Immobilier', parent: null },
  { slug: 'locations', nom: 'Locations', parent: 'immobilier' },
  { slug: 'ventes-immobilieres', nom: 'Ventes', parent: 'immobilier' },
  { slug: 'electronique', nom: 'Électronique', parent: null },
  { slug: 'telephones', nom: 'Téléphones', parent: 'electronique' },
  { slug: 'ordinateurs', nom: 'Ordinateurs', parent: 'electronique' },
  { slug: 'maison', nom: 'Maison', parent: null },
  { slug: 'meubles', nom: 'Meubles', parent: 'maison' },
  { slug: 'electromenager', nom: 'Électroménager', parent: 'maison' },
]

/** Le nom d'une catégorie, pour l'afficher : « Motos et scooters » plutôt que « motos ». */
export function nomCategorie(slug: string): string {
  return categoriesFictives.find((categorie) => categorie.slug === slug)?.nom ?? slug
}

/** La nature d'un prix (décision 0002). */
export type NaturePrix = 'FIXED' | 'NEGOTIABLE' | 'FREE' | 'SWAP'

export type AnnonceFictive = {
  id: string
  titre: string
  description: string
  categorie: string // le slug d'une sous-catégorie
  naturePrix: NaturePrix
  prix: number | null // en ariary; null pour un échange
  ville: string
  quartier: string
  distanceKm: number // arrondie : la position exacte n'est jamais montrée
  vendeur: string // un prénom; jamais de courriel ni de téléphone
  publieeLe: string // un instant ISO 8601
  photos: number // le nombre de photos, pour dessiner les emplacements
  aLaUne: boolean // mise en avant payée (module 11)
}

export const annoncesFictives: AnnonceFictive[] = [
  {
    id: 'a1',
    titre: 'Scooter 125 cm³, très bon état',
    description:
      'Acheté en 2022, entretenu chez le même garagiste. Deux casques fournis. Visible à Ankorondrano le soir.',
    categorie: 'motos',
    naturePrix: 'NEGOTIABLE',
    prix: 3_200_000,
    ville: 'Antananarivo',
    quartier: 'Ankorondrano',
    distanceKm: 3,
    vendeur: 'Tojo',
    publieeLe: '2026-10-12T07:30:00.000Z',
    photos: 4,
    aLaUne: true,
  },
  {
    id: 'a2',
    titre: 'Appartement deux pièces à louer, Isoraka',
    description:
      'Deuxième étage, eau et électricité JIRAMA, gardien la nuit. Libre au 1er novembre. Caution de deux mois.',
    categorie: 'locations',
    naturePrix: 'FIXED',
    prix: 900_000,
    ville: 'Antananarivo',
    quartier: 'Isoraka',
    distanceKm: 1,
    vendeur: 'Voahangy',
    publieeLe: '2026-10-11T15:10:00.000Z',
    photos: 6,
    aLaUne: false,
  },
  {
    id: 'a3',
    titre: 'Armoire en palissandre à donner',
    description:
      'Nous déménageons et elle ne rentre pas dans le camion. À venir chercher sur place, avec deux personnes.',
    categorie: 'meubles',
    naturePrix: 'FREE',
    prix: 0,
    ville: 'Antananarivo',
    quartier: 'Ambohijatovo',
    distanceKm: 2,
    vendeur: 'Mialy',
    publieeLe: '2026-10-12T05:45:00.000Z',
    photos: 2,
    aLaUne: false,
  },
  {
    id: 'a4',
    titre: 'Téléphone Android 128 Go, écran neuf',
    description:
      'Écran changé le mois dernier, batterie à 90 %. Vendu avec son chargeur et une coque. Pas d’échange.',
    categorie: 'telephones',
    naturePrix: 'FIXED',
    prix: 450_000,
    ville: 'Antananarivo',
    quartier: 'Analakely',
    distanceKm: 4,
    vendeur: 'Andry',
    publieeLe: '2026-10-10T09:00:00.000Z',
    photos: 3,
    aLaUne: false,
  },
  {
    id: 'a5',
    titre: 'J’échange mon vélo contre une guitare',
    description:
      'Vélo de ville, trois vitesses, pneus neufs. Je cherche une guitare acoustique en état de jouer.',
    categorie: 'motos',
    naturePrix: 'SWAP',
    prix: null,
    ville: 'Antananarivo',
    quartier: 'Ivandry',
    distanceKm: 6,
    vendeur: 'Fanja',
    publieeLe: '2026-10-09T12:20:00.000Z',
    photos: 1,
    aLaUne: false,
  },
  {
    id: 'a6',
    titre: 'Réfrigérateur 200 litres, fonctionne bien',
    description:
      'Nous en avons acheté un plus grand. Il refroidit parfaitement, un petit choc sur la porte.',
    categorie: 'electromenager',
    naturePrix: 'NEGOTIABLE',
    prix: 600_000,
    ville: 'Antsirabe',
    quartier: 'Centre',
    distanceKm: 140,
    vendeur: 'Rado',
    publieeLe: '2026-10-08T08:00:00.000Z',
    photos: 2,
    aLaUne: false,
  },
]

/** Une conversation entre un acheteur et un vendeur, à propos d'une annonce. */
export type MessageFictif = {
  id: string
  deMoi: boolean
  texte: string
  envoyeLe: string // un instant ISO 8601
}

export type ConversationFictive = {
  id: string
  annonceId: string
  avec: string // le prénom de l'autre membre
  nonLus: number
  messages: MessageFictif[]
}

export const conversationsFictives: ConversationFictive[] = [
  {
    id: 'c1',
    annonceId: 'a1',
    avec: 'Tojo',
    nonLus: 1,
    messages: [
      {
        id: 'm1',
        deMoi: true,
        texte: 'Bonjour, le scooter est-il toujours disponible ?',
        envoyeLe: '2026-10-12T08:02:00.000Z',
      },
      {
        id: 'm2',
        deMoi: false,
        texte: 'Bonjour, oui. Vous pouvez passer le voir ce soir après 18 h.',
        envoyeLe: '2026-10-12T08:15:00.000Z',
      },
    ],
  },
  {
    id: 'c2',
    annonceId: 'a3',
    avec: 'Mialy',
    nonLus: 0,
    messages: [
      {
        id: 'm3',
        deMoi: true,
        texte: 'Je peux venir chercher l’armoire samedi matin, avec mon frère.',
        envoyeLe: '2026-10-12T06:00:00.000Z',
      },
    ],
  },
]
