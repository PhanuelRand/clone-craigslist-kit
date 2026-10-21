# 0006 : Un instant se range en UTC, une journée se compte à Madagascar

- Date : 2026-10-13
- Statut : Accepté, par l'Académie

## Le problème

Une annonce reste en ligne trente jours. Un membre peut publier trois annonces
par jour. Mais quel jour ? Le serveur peut tourner en Europe ou aux États-Unis,
et l'heure de son horloge n'est pas celle de Madagascar. Une annonce qui
expirerait à minuit UTC disparaîtrait à 3 heures du matin à Antananarivo, et un
compteur remis à zéro à minuit UTC repartirait en pleine nuit.

## La décision

**Un instant se range dans une colonne `timestamptz`**, qui garde un point
précis dans le temps, quel que soit le fuseau du serveur. Le moment de la
publication est un instant.

**Une journée se compte à l'heure de Madagascar**, le fuseau
`Indian/Antananarivo`, soit UTC+3, sans heure d'été. Minuit à Madagascar, c'est
21 h 00 UTC.

- Une annonce publiée le 10 juillet, heure de Madagascar, expire le 9 août :
  le jour de publication compte, puis vingt-neuf autres. La date d'expiration
  est une colonne de type `date`, et l'annonce n'apparaît plus à partir de ce
  jour-là.
- Les publications du jour sont celles dont l'instant tombe entre minuit et
  minuit, heure de Madagascar.

L'instant présent est passé en paramètre au lieu d'être lu sur l'horloge, pour
que minuit se vérifie sans attendre minuit.

## Ce que ça coûte

Il faut convertir avant de comparer, et ne jamais découper une date avec
`toISOString()`, qui donne la date en UTC : la veille, entre minuit et 3 heures
du matin à Madagascar.

## Ce qui a été écarté

**Une expiration à l'heure près, trente fois vingt-quatre heures après la
publication.** Elle est juste, mais personne ne sait à quelle heure son
annonce disparaît. « Jusqu'au 8 août inclus » se lit sans calcul.
