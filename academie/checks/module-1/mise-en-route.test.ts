/**
 * Module 1 : Mise en route.
 *
 * Ce module ne demande pas d'écrire un programme. Il demande de préparer sa
 * machine, de créer son dépôt et d'obtenir une première vérification verte.
 * La suite ci-dessous vérifie donc la boucle de travail, pas une compétence :
 * si elle passe, c'est que votre dépôt, votre éditeur et l'intégration
 * continue se parlent correctement, et tout le reste du parcours repose
 * là-dessus.
 *
 * Contrat attendu, exporté par `src/academie/module-1.ts` :
 *
 *   export const miseEnRoute = {
 *     prenom: string,       // le vôtre
 *     editeur: string,      // l'éditeur de code que vous utilisez
 *     versionNode: string,  // ce que `node --version` répond chez vous
 *   }
 *
 * C'est aussi votre premier fichier traducteur. Tous les modules suivants en
 * ont un : c'est par lui que les vérifications atteignent votre code, et c'est
 * ce qui vous laisse ensuite nommer vos fichiers comme vous voulez.
 */
import { describe, expect, it } from 'vitest'
import { miseEnRoute } from '../../../src/academie/module-1'

const GABARITS = ['', 'votre prénom', 'votre prenom', 'prénom', 'prenom', 'à remplir']

describe('votre fiche de mise en route', () => {
  it('existe et porte les trois champs attendus', () => {
    expect(miseEnRoute, 'exportez un objet nommé miseEnRoute').toBeTypeOf('object')
    for (const champ of ['prenom', 'editeur', 'versionNode'] as const) {
      expect(miseEnRoute[champ], `le champ ${champ} est absent`).toBeTypeOf('string')
    }
  })

  it('porte votre prénom, et non le texte du gabarit', () => {
    const prenom = miseEnRoute.prenom.trim()
    expect(
      GABARITS.includes(prenom.toLocaleLowerCase('fr')),
      'remplacez le texte du gabarit par votre prénom',
    ).toBe(false)
    expect(prenom.length, 'votre prénom fait au moins deux caractères').toBeGreaterThan(1)
  })

  it('nomme l’éditeur de code que vous utilisez', () => {
    const editeur = miseEnRoute.editeur.trim()
    expect(
      GABARITS.includes(editeur.toLocaleLowerCase('fr')),
      'remplacez le texte du gabarit par le nom de votre éditeur',
    ).toBe(false)
    expect(editeur.length, 'indiquez votre éditeur').toBeGreaterThan(1)
  })
})

describe('votre installation de Node', () => {
  // Ce champ ne se devine pas : il faut ouvrir un terminal et lancer la
  // commande. C'est exactement ce que le module vous demande d'apprendre.
  it('rapporte ce que `node --version` répond', () => {
    expect(
      miseEnRoute.versionNode.trim(),
      'collez la réponse de `node --version`, par exemple v22.12.0',
    ).toMatch(/^v?\d+\.\d+\.\d+$/)
  })

  it('correspond à une version assez récente', () => {
    const [majeure = 0, mineure = 0] = (/^v?(\d+)\.(\d+)\./.exec(miseEnRoute.versionNode.trim()) ?? [])
      .slice(1)
      .map(Number)
    expect(
      majeure > 22 || (majeure === 22 && mineure >= 12),
      'le parcours demande Node 22.12 ou plus récent; installez-le avant de continuer',
    ).toBe(true)
  })
})

describe('votre dépôt', () => {
  // La suite tourne dans l'intégration continue de VOTRE dépôt : si ce test
  // s'exécute, c'est que le dépôt existe, que le workflow est en place et que
  // vous avez poussé au moins un commit. Rien à faire de plus.
  it('exécute bien le harnais de l’Académie', () => {
    expect(true).toBe(true)
  })
})
