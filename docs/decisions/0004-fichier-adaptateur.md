# 0004 : L'adaptateur est le seul contact avec les vérifications

- Date : 2026-10-13
- Statut : Accepté, par l'Académie

## Le problème

Les vérifications de l'Académie doivent atteindre votre code. Si elles
importaient vos fichiers directement, elles imposeraient leurs noms, leurs
dossiers et leur architecture. Vous ne construiriez pas votre application, vous
rempliriez la leur.

## La décision

**Chaque module a un fichier `src/academie/module-N.ts`, que vous écrivez.** Il
réexporte, sous les noms que le harnais attend, ce que vous avez construit sous
les noms que vous avez choisis.

C'est l'un des rares endroits du dépôt où des noms anglais sont imposés
(la liste complète est dans `AGENTS.md`). Partout
ailleurs vous nommez en français.

## Ce que ça coûte

Un fichier de plus par module, et une indirection à comprendre la première fois.

## Ce qui a été écarté

**Imposer une arborescence et des noms.** C'est plus simple à vérifier, et
c'est ce que font beaucoup d'exercices en ligne. Mais on n'apprend pas à
concevoir une application en remplissant des cases préparées, et le code obtenu
ne ressemble à rien qu'on puisse montrer.
