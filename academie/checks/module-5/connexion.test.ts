/**
 * Module 5 : Connexion, relier l'interface au serveur.
 *
 * Au module 4, vous avez écrit la logique : hacher un mot de passe, décider
 * d'un droit. Ici, votre serveur l'expose par des routes, et votre écran de
 * connexion les appelle. C'est la première fois que l'interface parle au
 * serveur.
 *
 * Cette suite appelle votre application directement en mémoire, avec
 * `app.request` de Hono, sans démarrer de serveur. Elle a besoin de votre base :
 * un compte inscrit doit y être enregistré.
 *
 * Contrat attendu, exporté par `src/academie/module-5.ts` :
 *
 *   export const connexion = {
 *     app,                   // votre application Hono, celle de src/serveur.ts
 *     routes: {
 *       inscription: string, // par exemple '/auth/inscription'
 *       connexion: string,   // par exemple '/auth/connexion'
 *       deconnexion: string, // par exemple '/auth/deconnexion'
 *       moi: string,         // le compte connecté, par exemple '/auth/moi'
 *     },
 *     origineInterface: string, // l'adresse de votre interface, 'http://localhost:5173'
 *   }
 *
 * Les routes reçoivent et rendent du JSON :
 *
 *   POST inscription   { email, motDePasse, nom, telephone? }
 *                        -> 201, 409 si le courriel est pris, 4xx si le numéro est invalide
 *   POST connexion     { email, motDePasse }       -> 200 et un cookie de session, ou 401
 *   POST deconnexion                               -> 200 ou 204, et le cookie effacé
 *   GET  moi                                       -> 200 { email, roles, telephone }, ou 401
 *
 * `telephone` est facultatif. Le serveur le range sous sa forme unique
 * (module 4) : `moi` le rend sous la forme '+261…', ou `null`. Un compte
 * inscrit a le rôle MEMBER.
 *
 * Le cookie de session est `HttpOnly`, pour que le JavaScript d'une page ne
 * puisse pas le lire, et porte un attribut `SameSite`. L'interface, qui tourne
 * à une autre adresse que le serveur, doit être autorisée à l'appeler avec ses
 * cookies (CORS).
 */
import { describe, expect, it } from 'vitest'
import { connexion } from '../../../src/academie/module-5'

const { app, routes, origineInterface } = connexion

function uniqueEmail() {
  return `verification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.org`
}

const motDePasse = 'mot-de-passe-de-verification-1'

function post(path: string, body: unknown, cookie?: string) {
  return app.request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origineInterface,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  })
}

/** Les cookies posés par une réponse, sous la forme d'un en-tête Cookie. */
function setCookies(response: Response) {
  return response.headers.getSetCookie()
}

function cookieHeader(response: Response) {
  return setCookies(response)
    .map((cookie) => cookie.split(';')[0])
    .join('; ')
}

async function registered() {
  const email = uniqueEmail()
  const response = await post(routes.inscription, { email, motDePasse, nom: 'Hery' })
  expect(response.status, 'l’inscription doit réussir').toBe(201)
  return email
}

async function signedIn() {
  const email = await registered()
  const response = await post(routes.connexion, { email, motDePasse })
  expect(response.status, 'la connexion doit réussir').toBe(200)
  return { email, response, cookie: cookieHeader(response) }
}

describe('l’inscription', () => {
  it('crée un compte et répond 201', async () => {
    await registered()
  })

  it('refuse un courriel déjà inscrit avec 409', async () => {
    const email = await registered()
    const response = await post(routes.inscription, { email, motDePasse, nom: 'Hery' })
    expect(response.status).toBe(409)
  })

  it('refuse un numéro de téléphone invalide, avec une erreur 4xx', async () => {
    const response = await post(routes.inscription, {
      email: uniqueEmail(),
      motDePasse,
      nom: 'Hery',
      telephone: '12 34',
    })
    expect(response.status, 'un numéro invalide doit être refusé').toBeGreaterThanOrEqual(400)
    expect(response.status).toBeLessThan(500)
  })

  it('range le numéro de téléphone sous sa forme unique', async () => {
    const email = uniqueEmail()
    const created = await post(routes.inscription, { email, motDePasse, nom: 'Hery', telephone: '034 12 345 67' })
    expect(created.status).toBe(201)
    const cookie = cookieHeader(await post(routes.connexion, { email, motDePasse }))

    const body = (await (await app.request(routes.moi, { headers: { Cookie: cookie } })).json()) as {
      telephone?: string | null
    }
    expect(body.telephone).toBe('+261341234567')
  })

  it('refuse une demande incomplète avec une erreur 4xx, jamais 5xx', async () => {
    const response = await post(routes.inscription, { email: uniqueEmail() })
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(response.status).toBeLessThan(500)
  })
})

describe('la connexion', () => {
  it('pose un cookie de session HttpOnly avec SameSite', async () => {
    const { response } = await signedIn()
    const cookies = setCookies(response)
    expect(cookies.length, 'la connexion doit poser un cookie').toBeGreaterThan(0)
    expect(cookies.join(';'), 'le cookie doit être HttpOnly').toMatch(/httponly/i)
    expect(cookies.join(';'), 'le cookie doit porter SameSite').toMatch(/samesite=/i)
  })

  it('ne renvoie jamais le mot de passe', async () => {
    const { response } = await signedIn()
    expect(await response.text()).not.toContain(motDePasse)
  })

  it('ne renvoie jamais le hachage du mot de passe', async () => {
    const { cookie } = await signedIn()
    const text = await (await app.request(routes.moi, { headers: { Cookie: cookie } })).text()
    expect(text, 'le hachage du mot de passe reste sur le serveur').not.toMatch(/\$argon2|\$2[aby]\$/)
  })

  // Dire « ce courriel est inconnu » apprendrait à n'importe qui qui est inscrit.
  it('répond 401 avec le même message, courriel inconnu ou mot de passe faux', async () => {
    const email = await registered()
    const wrongPassword = await post(routes.connexion, { email, motDePasse: 'autre-chose-1' })
    const unknownEmail = await post(routes.connexion, { email: uniqueEmail(), motDePasse })

    expect(wrongPassword.status).toBe(401)
    expect(unknownEmail.status).toBe(401)
    expect(await wrongPassword.text()).toBe(await unknownEmail.text())
  })
})

describe('le compte connecté', () => {
  it('rend le compte et ses rôles quand le cookie est présent', async () => {
    const { email, cookie } = await signedIn()
    const response = await app.request(routes.moi, { headers: { Cookie: cookie } })

    expect(response.status).toBe(200)
    const body = (await response.json()) as { email?: string; roles?: string[] }
    expect(body.email).toBe(email)
    expect(body.roles, 'un compte inscrit est membre').toContain('MEMBER')
  })

  it('répond 401 sans cookie', async () => {
    const response = await app.request(routes.moi)
    expect(response.status).toBe(401)
  })

  it('efface le cookie à la déconnexion', async () => {
    const { cookie } = await signedIn()
    const response = await post(routes.deconnexion, {}, cookie)

    expect([200, 204]).toContain(response.status)
    expect(
      setCookies(response).join(';'),
      'la déconnexion doit effacer le cookie : Max-Age=0 ou une date passée',
    ).toMatch(/max-age=0|expires=thu, 01 jan 1970/i)
  })
})

describe('l’interface autorisée', () => {
  // Sans cette autorisation, le navigateur bloque les appels de votre interface.
  it('autorise l’origine de l’interface, avec ses cookies', async () => {
    const response = await app.request(routes.connexion, {
      method: 'OPTIONS',
      headers: {
        Origin: origineInterface,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    })

    expect(response.headers.get('access-control-allow-origin')).toBe(origineInterface)
    expect(response.headers.get('access-control-allow-credentials')).toBe('true')
  })

  it('n’autorise pas une autre origine', async () => {
    const response = await app.request(routes.connexion, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://site-inconnu.example',
        'Access-Control-Request-Method': 'POST',
      },
    })

    expect(response.headers.get('access-control-allow-origin')).not.toBe(
      'https://site-inconnu.example',
    )
    expect(response.headers.get('access-control-allow-origin')).not.toBe('*')
  })
})
