# Les décisions de ce projet

Une décision d'architecture est un choix qu'on ne refait pas tous les jours, et
qu'on regrette de ne pas avoir écrit six mois plus tard. Ce dossier les garde.

Chaque fichier dit la même chose : le problème, le choix, ce qu'il coûte, et ce
qui a été écarté. Une demi-page suffit. Le format vient d'une pratique courante
du métier, les *Architecture Decision Records*.

Les sept premières sont déjà écrites : ce sont les choix que l'Académie a faits
pour vous, et que les vérifications contrôlent. Lisez-les avant d'écrire du
code, elles expliquent le *pourquoi* que les tests ne disent pas.

Les suivantes sont les vôtres. Copiez `0000-gabarit.md` dès que vous tranchez
quelque chose : le nom de vos tables, votre découpage en dossiers, la
bibliothèque que vous avez retenue.

| Décision | Sujet |
| --- | --- |
| [0001](./0001-un-arbre-de-categories.md) | Les catégories forment un arbre à deux niveaux |
| [0002](./0002-un-prix-et-sa-nature.md) | Un prix est un entier en ariary, avec sa nature |
| [0003](./0003-cycle-de-vie-en-un-seul-endroit.md) | Un seul endroit décide des passages |
| [0004](./0004-fichier-adaptateur.md) | L'adaptateur est le seul contact avec les vérifications |
| [0005](./0005-front-et-api-separes.md) | Le front et l'API sont deux applications |
| [0006](./0006-un-jour-a-madagascar.md) | Un instant se range en UTC, une journée se compte à Madagascar |
| [0007](./0007-un-telephone-une-forme.md) | Un numéro de téléphone se range sous une seule forme |
