# Instructions pour un assistant

Ce dépôt est le projet d'un étudiant de l'Académie IA : un site de petites
annonces, à la manière de Craigslist et de Kijiji, construit module après
module, en dix-huit modules. Des membres publient des annonces rangées par
catégorie, d'autres les trouvent par la recherche, font une offre et écrivent
au vendeur. L'étudiant débute souvent en programmation. Ces règles valent pour
tout assistant qui écrit du code ici.

Expliquez ce que vous faites en français simple, et définissez un mot technique
la première fois que vous l'employez. Nommez les fichiers, les classes, les
tables et les variables en français, sauf là où ce document dit le contraire.

## Ce qu'il ne faut jamais faire

**Ne modifiez jamais `academie/checks/`, `academie/run.mjs` ni
`.github/workflows/academie.yml`.** Ce sont les vérifications de l'Académie.
Leurs empreintes sont comparées à chaque remise : un fichier modifié envoie le
travail de l'étudiant en revue humaine, même s'il est juste.

Quand une vérification échoue, la réponse n'est jamais de changer le test. Elle
est de corriger le code de l'étudiant, dans `src/`, `web/` ou `migrations/`.

**Ne mettez aucun secret dans le code.** L'adresse de la base et les clés vont
dans `.env`, qui n'est pas versionné. Un mot de passe envoyé sur GitHub reste
lisible dans l'historique après avoir été retiré.

**Ne remplacez pas les choix de l'étudiant sans le lui dire.** S'il a nommé une
table `annonces`, gardez `annonces`.

**N'ajoutez pas de service qui exige une carte bancaire.** Le parcours n'en
emploie aucun : le paiement est simulé, les photos passent par un stockage
simulé en local et par Supabase Storage en production, l'hébergement se fait
sur Render.

**Ne rendez jamais l'adresse électronique, le numéro de téléphone ni la
position exacte d'un membre à un autre membre.** Une annonce montre un prénom,
une ville et une distance arrondie. Les acheteurs écrivent au vendeur par la
messagerie du site : c'est ce qui protège les vendeurs des arnaques et du
démarchage.

**N'écrivez jamais le contenu d'un message, une adresse électronique, un
numéro de téléphone ou une position dans les journaux du serveur**,
c'est-à-dire les messages qu'il écrit pendant qu'il tourne.

## Comment les vérifications atteignent le code

Les suites de `academie/checks/` n'importent jamais les fichiers de l'étudiant.
Elles importent un fichier par module, `src/academie/module-N.ts`, que le cours
appelle le **fichier traducteur**. Il réexporte, sous les noms attendus, ce que
l'étudiant a construit sous ses propres noms.

```ts
// À gauche, le nom attendu. À droite, celui de l'étudiant.
export { normaliserTelephone as normalizePhone } from '../domaine/telephone'
```

Quand la vérification attend une classe avec des méthodes aux noms anglais
(`Listing.publish`, `transitionTo`), et que l'étudiant a écrit les siennes en
français, le fichier traducteur ne peut pas se contenter de renommer la classe :
il l'enveloppe dans une petite classe qui appelle les méthodes françaises.

L'en-tête de chaque fichier de `academie/checks/module-N/` écrit exactement ce
que le fichier traducteur de ce module doit exporter. Lisez-le avant d'écrire
du code pour un module.

## Là où l'anglais est imposé

Partout ailleurs, le français est la règle.

- **Les noms exportés par les fichiers traducteurs**, comme `Listing` ou
  `makeOffer`, et les valeurs qu'ils échangent, comme `ACTIVE` ou `RESERVED`.
- **Les routes vérifiées au module 15** : `GET /health`, `GET /listings`,
  `POST /listings`, `POST /offers`, `GET /conversations`.
- **Les composants de shadcn**, dans `web/src/components/ui`. On garde leur
  convention : c'est celle que toute la documentation emploie.

Les routes de connexion du module 5 sont libres : l'étudiant les déclare dans
son fichier traducteur.

## Les conventions du domaine

Elles sont expliquées dans `docs/decisions/`.

- **Les catégories forment un arbre à deux niveaux.** Une annonce se range
  dans une sous-catégorie, par exemple « Voitures » sous « Véhicules ».
  Chercher dans « Véhicules » trouve aussi les voitures et les motos.
- **Un prix est un entier en ariary, avec sa nature.** Prix fixe, prix à
  débattre, gratuit ou échange. L'ariary n'a pas de centimes : 150 000 Ar se
  stockent `150000`.
- **Le cycle de vie d'une annonce est décrit en un seul endroit.** Les statuts
  sont `ACTIVE`, `RESERVED`, `SOLD`, `EXPIRED` et `REMOVED`.
- **Un numéro de téléphone se range sous une seule forme** : `+261` suivi des
  neuf chiffres, par exemple `+261341234567`, quelle que soit la façon dont le
  membre l'a tapé.
- **Un instant se range en `timestamptz`, une journée se compte à
  Madagascar.** Une annonce expire trente jours après sa publication, à minuit,
  heure de Madagascar (UTC+3), et les publications du jour repartent à zéro à
  la même heure.

## La base de données

PostgreSQL, avec la bibliothèque `pg` et du SQL écrit à la main. Pas d'ORM :
les règles centrales du parcours, une seule offre acceptée par annonce et un
quota de publications qui tient sous la charge, reposent sur des contraintes et
des verrous que l'on doit voir écrits.

Les migrations sont des fichiers `.sql` numérotés dans `migrations/`.
`npm run migrate` les applique, sur la machine comme dans les vérifications de
GitHub. Le code lit l'adresse de la base dans `process.env.DATABASE_URL`.

## La structure

```text
academie/            les vérifications. Ne pas toucher.
src/app.ts           les routes de l'API, en Hono.
src/serveur.ts       le démarrage de l'API.
src/academie/        les fichiers traducteurs.
migrations/          le SQL des tables.
web/                 l'interface, en Vite et React.
docs/                la spécification, les décisions, les rapports.
```

L'interface et l'API sont **deux applications** qui s'installent séparément.
À partir du module 3, les vérifications construisent aussi l'interface avec
`npm run build` : une erreur de type dans `web/` fait échouer le module.

## Les commandes

```bash
npm run academie 5     # les vérifications jusqu'au module 5
npm run academie 12 -- --seul   # la seule suite du module 12, pour relire un échec
npm run migrate        # applique les migrations
npm run dev            # l'API, sur le port 3000
npm run dev:web        # l'interface, sur le port 5173
npm test               # les tests de l'étudiant, dans src/
npm run typecheck      # les types de l'API
node --env-file=.env scripts/nommer-moderateur.mjs courriel   # donne le rôle de modérateur
```

`npm run academie` écrit ses données d'essai dans `DATABASE_URL_VERIFICATION`
quand elle est définie, et y applique d'abord les migrations. Ne pointez jamais
cette variable vers la base de l'application.

Lancez `npm run academie N` et `npm run typecheck` avant chaque envoi. Les
vérifications sont cumulatives : au module 5, celles des modules 1 à 4 tournent
encore. Elles ne contrôlent pas les types de `src/` : c'est `npm run typecheck`
qui le fait.

Ne lancez jamais `npx vitest` directement sur `academie/checks/` : sans le
lanceur, `.env` n'est pas lu, et les données d'essai iraient dans la base de
l'application au lieu de `DATABASE_URL_VERIFICATION`.

Les modules 16 et 17, signalements et avis, ne concernent que le palier
Platine. Le module 18, l'extra visuel, est vendu à part.

## L'interface

Tailwind CSS et [shadcn/ui](https://ui.shadcn.com) sont déjà configurés. Un
composant s'ajoute depuis `web/` :

```bash
npx shadcn@latest add button
```

Le kit en fournit déjà plusieurs : bouton, champ, zone de texte, étiquette,
liste déroulante (`native-select`, pour la catégorie), onglets, carte, badge,
séparateur, boîte de dialogue, avatar, curseur (`slider`, pour un rayon ou un
prix) et interrupteur. Le routeur est `react-router`, câblé dans
`web/src/main.tsx`. Des annonces inventées attendent dans
`web/src/donnees/fictives.ts`.

Les écrans se construisent au module 3 sur ces données fictives. Chaque module
suivant branche l'écran qui le concerne sur l'API : remplacez l'import des
données fictives par un appel à l'API, sans réécrire la mise en page.

Pensez d'abord au téléphone : c'est là que la plupart des membres chercheront
et publieront leurs annonces.

Les couleurs sont des variables CSS dans `web/src/styles.css`. Ne mettez jamais
une couleur en dur dans un composant.

**N'écrivez pas de composant maison pour ce que shadcn fournit déjà.**

Deux pièges propres à ces composants :

- Le `Button` de shadcn se rend avec `type="button"`. Dans un `<form>`, il n'envoie
  donc jamais le formulaire, sans erreur ni message. Écrivez `type="submit"` sur le
  bouton qui envoie.
- Un champ de fichier caché (`className="hidden"`) n'a pas d'`aria-label` : un champ
  qu'on ne voit pas ne se nomme pas, et il ferait doublon avec le bouton qui l'ouvre.
