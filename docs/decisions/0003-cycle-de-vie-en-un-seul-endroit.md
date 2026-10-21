# 0003 : Un seul endroit décide des passages

- Date : 2026-10-13
- Statut : Accepté, par l'Académie

## Le problème

Une annonce traverse plusieurs situations : en ligne, réservée pour un
acheteur, vendue, expirée, retirée. Si plusieurs fichiers se permettent de
changer cette situation, chacun applique sa propre lecture des règles.

On voit alors une annonce vendue qui revient dans la recherche, ou une annonce
retirée par la modération qui reçoit encore des offres, sans pouvoir dire quel
fichier en est la cause.

## La décision

**Les passages autorisés sont décrits dans un seul objet, et une seule méthode
les applique.** Elle lève une erreur quand le passage demandé n'est pas permis.
Aucun autre code ne modifie le statut d'une annonce.

| Depuis | Vers |
| --- | --- |
| `ACTIVE` | `RESERVED`, `SOLD`, `EXPIRED`, `REMOVED` |
| `RESERVED` | `ACTIVE`, `SOLD`, `REMOVED` |
| `EXPIRED` | `ACTIVE`, `REMOVED` |
| `SOLD` | `REMOVED` |
| `REMOVED` | aucun |

Une annonce retirée l'est définitivement : aucune situation n'en sort.

## Ce que ça coûte

Un détour : un service qui veut marquer une annonce vendue ne peut pas écrire
le nouveau statut directement, il doit passer par cette méthode.

## Ce qui a été écarté

**Un `if` à chaque endroit qui change l'état.** C'est plus rapide à écrire les
trois premières fois. Au dixième, plus personne ne sait quelles règles
s'appliquent réellement, et les corriger demande de toutes les retrouver.
