# Votre serveur

C'est ici que vous construisez le serveur de votre site de petites annonces, avec Hono.
On l'appelle aussi l'API : c'est le programme qui reçoit les demandes de votre
interface et leur répond.

- `app.ts` décrit vos routes. C'est là que vous écrivez.
- `serveur.ts` démarre l'application. Vous le modifiez rarement, et le cours
  vous dit quand : pour une tâche qui revient à intervalle régulier, ou pour
  brancher le temps réel (le WebSocket).

L'interface est à côté, dans `web/`. Ce sont deux applications distinctes, et
la raison est écrite dans `docs/decisions/0005`.

## Les fichiers traducteurs

Les vérifications de l'Académie n'ouvrent jamais vos fichiers directement.
Elles lisent un seul fichier par module, que vous écrivez dans `src/academie/` :
`module-1.ts`, `module-2.ts`, et ainsi de suite.

Ce fichier traduit. Il donne aux vérifications, sous les noms qu'elles
attendent, ce que vous avez construit sous vos propres noms :

```ts
// src/academie/module-2.ts
// À gauche, le nom attendu. À droite, le vôtre.
export { normaliserTelephone as normalizePhone } from '../domaine/telephone'
```

Vous nommez donc vos tables, vos fichiers et vos fonctions comme vous voulez.
Ce que chaque fichier traducteur doit fournir est écrit dans le paragraphe
« Ce que la vérification contrôle » du module, sur le portail, et en tête des
fichiers de `academie/checks/module-N/`.

Le fichier du module 1 est déjà là, avec un texte à remplacer.

## Où trouver de l'aide

| Où | Ce que vous y trouvez |
| --- | --- |
| Le cours du module, sur le portail | Comment y arriver : les notions, les étapes, les demandes à faire à votre assistant |
| La consigne du module, sur le portail | Ce qu'il faut produire, et à quoi ce sera mesuré |
| Le message d'une vérification rouge | Ce qui manque, en français |

## Votre façon de travailler

Au premier envoi sur GitHub, presque toutes les vérifications sont rouges. C'est
normal : vous les faites passer au vert une par une, module après module.

Pour voir où vous en êtes sans attendre GitHub :

```bash
npm run academie 3
```

La commande lance les vérifications des modules 1 à 3. Elles s'accumulent : au
module 5, celles des modules 1 à 4 tournent encore, pour qu'un changement ne
casse pas ce qui marchait. Lancez-la avant chaque envoi.

## Ce que les vérifications ne contrôlent pas

Certains critères ne se vérifient pas par un programme : une mesure de vitesse,
un diagnostic écrit. Ils sont marqués « Relu par un mentor » dans la consigne.
Vous les déposez dans `docs/rapports/`, sous le nom indiqué par le module.
