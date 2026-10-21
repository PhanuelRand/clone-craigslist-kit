# 0002 : Un prix est un entier en ariary, avec sa nature

- Date : 2026-10-13
- Statut : Accepté, par l'Académie

## Le problème

Sur un site de petites annonces, toutes les annonces n'ont pas un prix au sens
strict. Un vendeur fixe son prix, un autre écrit « à débattre », un troisième
donne une armoire, un quatrième l'échange contre un vélo. Ranger tout cela dans
une seule colonne de texte rend la recherche par prix impossible.

## La décision

**Un prix a une nature et un montant.**

| Nature | Montant |
| --- | --- |
| `FIXED`, prix fixe | un entier strictement positif |
| `NEGOTIABLE`, à débattre | un entier strictement positif, le prix demandé |
| `FREE`, gratuit | `0` |
| `SWAP`, échange | aucun montant (`null`) |

Le montant est un **entier, en ariary**, qui n'a pas de centimes :
150 000 Ar se stockent `150000`. La colonne est de type `integer` ou `bigint`,
jamais `numeric`, `real` ni `money`.

Une recherche avec un prix minimum ou maximum ne montre jamais d'échange, qui
n'a pas de prix.

## Ce que ça coûte

Deux colonnes au lieu d'une, et une règle de cohérence entre elles à vérifier
dans le code et dans la base, par une contrainte `check`.

## Ce qui a été écarté

**Un nombre à virgule.** `0.1 + 0.2` ne vaut pas `0.3` en virgule flottante, et
une somme d'argent ne tolère aucune approximation.

**Un prix nul pour dire « à débattre ».** On ne distingue plus une annonce
gratuite d'une annonce sans prix, et la recherche « moins de 50 000 Ar »
remonte toutes les annonces à débattre.
