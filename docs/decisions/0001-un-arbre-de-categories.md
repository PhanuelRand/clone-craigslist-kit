# 0001 : Les catégories forment un arbre à deux niveaux

- Date : 2026-10-13
- Statut : Accepté, par l'Académie

## Le problème

Un site de petites annonces range des milliers d'objets différents. Une liste
plate de quarante catégories est illisible sur un téléphone, et une personne qui
cherche « un véhicule » ne sait pas encore si ce sera une voiture ou une moto.

## La décision

**Les catégories forment un arbre à deux niveaux.** Une catégorie principale,
comme « Véhicules », a des sous-catégories, comme « Voitures » et « Motos ».
Une annonce se range toujours dans une **sous-catégorie**. Chercher dans une
catégorie principale trouve les annonces de toutes ses sous-catégories.

Les catégories vivent dans une table, avec une colonne qui désigne leur parent,
remplie par une migration. Chacune a un identifiant court et lisible, le
*slug* : `vehicules`, `voitures`. Les vérifications emploient ces slugs :

| Catégorie principale | Sous-catégories |
| --- | --- |
| `vehicules` | `voitures`, `motos` |
| `immobilier` | `locations`, `ventes-immobilieres` |
| `electronique` | `telephones`, `ordinateurs` |
| `maison` | `meubles`, `electromenager` |

Vous pouvez en ajouter d'autres, à condition de garder celles-ci.

## Ce que ça coûte

Une recherche par catégorie doit chercher la catégorie demandée et ses enfants.
Avec deux niveaux, une jointure sur le parent suffit.

## Ce qui a été écarté

**Un arbre de profondeur libre.** Plus souple, mais il faut alors une requête
récursive pour trouver tous les descendants, et personne ne navigue dans plus
de deux niveaux sur un téléphone.

**Des étiquettes libres à la place des catégories.** Chacun écrit « voiture »,
« voitures » ou « auto », et la recherche ne retrouve plus rien.
