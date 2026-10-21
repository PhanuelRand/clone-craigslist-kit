/**
 * Module 15 : Mise en production.
 *
 * Cette suite n'interroge pas votre code source : elle interroge **votre
 * application déployée**, à son adresse publique. C'est la preuve qu'elle
 * fonctionne vraiment, hors de votre machine.
 *
 * Elle ne crée rien et ne modifie rien : votre base de production ne reçoit
 * aucune donnée de vérification.
 *
 * Renseignez deux secrets dans les paramètres de votre dépôt GitHub (Settings,
 * puis Secrets and variables, puis Actions) :
 *
 *   DEPLOYMENT_URL   l'adresse de votre API, par exemple https://mon-api.onrender.com
 *   INTERFACE_URL    l'adresse de votre interface, par exemple https://mon-clone.onrender.com
 *
 * Contrat HTTP exigé :
 *
 *   GET  /health               -> 2xx
 *   GET  /listings             -> 2xx et du JSON : la recherche est publique
 *   POST /listings             -> 401 sans session : publier demande d'être connecté
 *   POST /offers               -> 401 sans session : faire une offre aussi
 *   GET  /conversations        -> 401 sans session : les conversations sont privées
 *   Une requête mal formée     -> 4xx, jamais 5xx
 *
 * Un hébergeur gratuit endort l'application après quelques minutes sans
 * visite : la première requête peut prendre près d'une minute. La suite
 * l'attend.
 */
import { describe, expect, it } from 'vitest'

const apiUrl = (process.env.DEPLOYMENT_URL ?? '').replace(/\/$/, '')
const interfaceUrl = (process.env.INTERFACE_URL ?? '').replace(/\/$/, '')
const timeout = 90_000

function call(url: string, init: RequestInit = {}): Promise<Response> {
  if (!/^https?:\/\//.test(url)) {
    throw new Error('Adresse manquante : renseignez les secrets DEPLOYMENT_URL et INTERFACE_URL.')
  }
  return fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
    // Un déploiement endormi doit se réveiller, mais pas bloquer la suite.
    signal: AbortSignal.timeout(timeout),
  })
}

describe('l’API déployée', () => {
  it('a une adresse configurée, servie en HTTPS', () => {
    expect(apiUrl, 'renseignez le secret DEPLOYMENT_URL avec l’adresse de votre API').toMatch(
      /^https:\/\/.+/,
    )
  })

  it('répond sur son point de santé', { timeout }, async () => {
    const response = await call(`${apiUrl}/health`)
    expect(response.ok).toBe(true)
  })
})

describe('la recherche publique', () => {
  // Un site d'annonces se consulte sans compte : c'est ainsi qu'il trouve ses acheteurs.
  it('répond à un visiteur anonyme, en JSON', { timeout }, async () => {
    const response = await call(`${apiUrl}/listings`)
    expect(response.ok, 'la recherche est publique : GET /listings répond sans session').toBe(true)
    expect(response.headers.get('content-type') ?? '').toMatch(/json/)
  })
})

describe('les routes protégées', () => {
  it('refuse de publier sans session', { timeout }, async () => {
    const response = await call(`${apiUrl}/listings`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Annonce anonyme', category: 'meubles', priceKind: 'FREE', price: 0 }),
    })
    expect(response.status).toBe(401)
  })

  it('refuse de faire une offre sans session', { timeout }, async () => {
    const response = await call(`${apiUrl}/offers`, {
      method: 'POST',
      body: JSON.stringify({ listingId: 'une-annonce', amount: 1000 }),
    })
    expect(response.status).toBe(401)
  })

  it('refuse la liste des conversations sans session', { timeout }, async () => {
    const response = await call(`${apiUrl}/conversations`)
    expect(response.status).toBe(401)
  })

  it('répond à une requête mal formée par une erreur 4xx, jamais 5xx', { timeout }, async () => {
    const malformed = await call(`${apiUrl}/listings`, { method: 'POST', body: '{ pas du json' })
    expect(malformed.status).toBeGreaterThanOrEqual(400)
    expect(malformed.status).toBeLessThan(500)

    const strange = await call(`${apiUrl}/listings?limit=beaucoup&minPrice=cher`)
    expect(strange.status).toBeLessThan(500)
  })
})

describe('l’interface déployée', () => {
  it('a une adresse configurée, servie en HTTPS', () => {
    expect(
      interfaceUrl,
      'renseignez le secret INTERFACE_URL avec l’adresse de votre interface',
    ).toMatch(/^https:\/\/.+/)
  })

  it('sert une page HTML', { timeout }, async () => {
    const response = await call(interfaceUrl, { headers: { Accept: 'text/html' } })
    expect(response.ok).toBe(true)
    expect(await response.text()).toMatch(/<html[\s>]/i)
  })
})
