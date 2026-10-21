import { Hono } from 'hono'

/**
 * Votre application : les routes de votre API.
 *
 * Elle ne fait presque rien pour l'instant : une seule route, qui répond que le
 * serveur est en vie. C'est volontaire. Tout le reste, vous l'écrivez.
 *
 * La route `/health` a pourtant une raison d'être dès maintenant : au
 * module 15, la vérification l'interroge sur votre déploiement pour établir que
 * votre application tourne vraiment. Gardez-la.
 *
 * Ce fichier décrit l'application sans la démarrer. C'est `serveur.ts` qui la
 * démarre. La séparation permet aux vérifications du module 5 d'appeler vos
 * routes en mémoire, sans ouvrir de port.
 */
export const app = new Hono()

app.get('/health', (c) => c.json({ statut: 'ok' }))

// Votre interface tourne sur une autre adresse que votre API. Le navigateur
// refuse alors ses appels, sauf si l'API dit explicitement qui a le droit de
// l'interroger (CORS). Vous vous en occuperez au module 5, quand votre écran de
// connexion appellera l'API pour la première fois.
