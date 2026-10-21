# 0005 : Le front et l'API sont deux applications

- Date : 2026-10-13
- Statut : Accepté, par l'Académie

## Le problème

L'application a besoin d'un serveur qui conserve les données et d'une interface
qui les montre. Les deux peuvent tenir dans un seul programme, ou dans deux.

## La décision

**Deux applications.** `src/` porte l'API, écrite avec Hono. `web/` porte le
front, en Vite et React. Chacune a ses dépendances et se lance séparément.

## Ce que ça coûte

Deux installations, deux commandes pour développer, et deux déploiements au
module 15. Il faut aussi autoriser explicitement votre front à interroger votre
API, puisqu'ils ne sont pas à la même adresse.

En échange, chaque application reste simple à lire et à déployer. Les
vérifications des modules 1 et 2 n'ont pas besoin de l'interface; à partir du
module 3, elles la construisent aussi.

## Ce qui a été écarté

**Un cadre qui réunit les deux**, du type de Next.js. Un seul déploiement, une
seule installation, et pas de question d'origines. Mais il impose sa façon de
ranger le code jusque dans le serveur, et il rend moins visible la frontière
entre ce qui tourne chez l'utilisateur et ce qui tourne chez vous. Cette
frontière est précisément ce que le parcours enseigne.
