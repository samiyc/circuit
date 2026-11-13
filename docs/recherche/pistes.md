# Les pistes à tester

Les expériences du projet, classées par ordre de passage. Chacune dit ce qu'elle doit trancher et contre quoi elle se
mesure. Une piste qui ne tranche rien n'est pas lancée. Rédigé le 13/11/2026, d'après [ligne-ideale.md](ligne-ideale.md),
[pilote.md](pilote.md), [trackmania.md](trackmania.md) et [bancs.md](bancs.md).

## Vue d'ensemble

| # | Piste | Jalon | Ce qu'elle tranche | Dans la lib |
|---|---|---|---|---|
| P1 | Le profil de vitesse et trois lignes de référence | J1 | le socle : une note juste et rapide | `random`, `measure` |
| P2 | CMA-ES sur les écarts, noté par le temps | J2 | CMA-ES bat-il la courbure minimale et l'escalade ? | `cmaes`, `climb` |
| P3 | La forme de la ligne : N, spline, du grossier au fin | J2 | combien de gènes, et comment les poser | `cmaes`, `mcts-race` |
| P4 | Les deux étapes de Stanford | J2-J3 | un pas convexe bat-il CMA-ES ? | le QP, à écrire |
| P5 | L'optimisation bayésienne | plus tard | paie-t-elle quand la note coûte cher ? | à écrire |
| P6 | Les entrées pas à pas contre la ligne puis le suivi | J4 | la leçon du *bruteforce* de Trackmania | `climb`, `beam` |
| P7 | Le pilote : poursuite pure, faisceau, escalade | J4 | qui tient la ligne avec une voiture qui glisse | `beam`, `climb` |
| P8 | La pluie et les surfaces | J5 | la ligne s'adapte-t-elle à l'adhérence ? | `cmaes` |
| P9 | Sami aux commandes (clavier et manette), contre les fantômes | J4-J5 | le jeu, et le test humain du pilote | – |
| P10 | Plusieurs voitures, en fantômes (sans collision) | plus tard | une course à plusieurs, sans contact | – |
| P11 | La ligne et le réglage ensemble | plus tard | le résultat de Perantoni et Limebeer, sans gradients | `cmaes` |
| P12 | L'auto-jeu, une valeur apprise | bien plus tard | ce que fait Linesight, à notre échelle | – |

## P1. Le profil de vitesse et trois lignes de référence (J1)

- **À écrire** : le format de piste de TU Munich (ligne centrale et largeurs), la ligne comme N écarts, la courbure
  discrète, le profil avant-arrière d'un point matériel (μ·g, une accélération et un freinage maximaux).
- **Les pistes** : des circuits de F1 et Le Mans (Sami, 13/11). La base TUM a 25 circuits, **sans Le Mans**
  ([bancs.md](bancs.md) § 1) ; la Sarthe attendra une autre source. La voiture : la F1 de `laptime-simulation`
  (733 kg, μ des pneus 1,65 à 2,15, appui et traînée), réduite au J1 à un point matériel, avec l'appui qui fait
  monter l'adhérence avec v² ([questions.md](questions.md) § 1, question 5).
- **Les trois références** : la ligne centrale, la plus courte, la courbure minimale. Les deux dernières se trouvent
  sans QP au début, par une descente projetée sur leur note (longueur, courbure²). Le QP vient en P4.
- **Les tests** : sur un cercle, la vitesse est constante et égale à √(μ·g·R) ; sur une ligne droite, le temps
  suit la cinématique exacte ; le profil ne dépasse jamais l'adhérence ; tout se rejoue.
- **Le banc** : le temps de la note en microsecondes, par tour et par point. C'est lui qui fixe le budget de P2.
- **La vérification** : notre courbure minimale doit ressembler à la ligne de course de la base TUM sur un de ses
  circuits (même forme, un écart à mesurer).
- **Le cas « pied au plancher »** : un virage assez ouvert se passe à fond (Sami, 13/11). Un test le vérifie : là où
  la vitesse limite du virage dépasse la vitesse atteinte, le profil ne freine pas.

## P2. CMA-ES sur les écarts, noté par le temps (J2)

C'est la première vraie question du projet.

- **Le dispositif** : les écarts ramenés dans [−1, 1] (la largeur de la piste) ; CMA-ES avec un sigma de 0,3 ; la
  note est moins le temps au tour. On compare à budget de lignes égal avec l'escalade (un écart à la fois, puis un
  bloc d'écarts voisins) et avec la courbure minimale de P1.
- **Les bornes** : un écart hors de la piste est ramené au bord (ou pénalisé : à mesurer, les deux se font).
- **Ce qu'on attend, en hypothèse** : CMA-ES devant l'escalade, nettement, car deux écarts voisins sont corrélés.
  Devant la courbure minimale, de peu : le gain se fait aux sorties de virage, là où la courbure minimale n'exploite
  pas l'accélération (README de TU Munich).
- **Le contrôle qualitatif** : sans qu'on le lui dise, la ligne prend l'extérieur, la corde, puis l'extérieur, et
  elle place la corde plus tard dans un virage suivi d'une ligne droite.
- **Le retour de codingame (13/11)** : sur Mars Lander, CMA-ES a perdu contre le recuit. Les gènes y sont entiers
  et la note y est en marche d'escalier (posé ou non). Ici les gènes sont réels et la note est continue : c'est le
  cas inverse, celui où CMA-ES doit gagner. C'est ce que P2 vérifie.

## P3. La forme de la ligne (J2)

- **N** : de 20 à 200 écarts. Plus N grandit, plus la ligne est fine, mais plus CMA-ES coûte (n² par plan, n³ par
  décomposition) et apprend lentement.
- **La spline** : D points de passage et une spline cubique, comme Jain et Morari. Moins de gènes, une ligne lisse
  par construction.
- **Du grossier au fin** : optimiser 20 gènes, interpoler à 80, repartir de là. C'est l'idée « multi-résolution ».
- **La décision** : par la course aux configurations (`mcts-race`) sur des pistes tirées par graine. Les variantes
  nettement moins bonnes sortent vite.

## P4. Les deux étapes de Stanford (J2-J3)

- **Le dispositif** : le profil de vitesse, puis un pas convexe sur la ligne qui réduit la courbure pondérée par la
  vitesse, sous les bornes de la piste, et on recommence (Kapania et al., 2015).
- **Ce qu'il faut** : un petit solveur QP à bornes. **Décidé par Sami le 13/11** : il s'écrit dans la lib
  (`mcts-commun`), car `reseau` en a besoin pour le DC-OPF. C'est la session `commun` qui l'écrit, à la demande du
  premier des deux projets qui en a besoin.
- **La question** : à temps de calcul égal, le pas convexe bat-il CMA-ES ? Et CMA-ES, parti de la ligne des deux
  étapes, gagne-t-il encore ?

## P5. L'optimisation bayésienne (plus tard)

Jain et Morari la recommandent pour trouver vite la ligne d'une piste nouvelle. Elle ne paie que si une note coûte
cher. **Le cas où elle servirait** : noter une ligne par un tour complet du pilote de J4, avec une voiture qui glisse
(des millisecondes, voire plus). Elle ne sert à rien tant que la note est le profil de vitesse.

## P6. Les entrées pas à pas contre la ligne puis le suivi (J4)

C'est la leçon de Trackmania ([trackmania.md](trackmania.md) § 2). Le *bruteforce* des TAS perturbe les entrées pas à
pas, et ses entrées tremblent.

- **A** : une escalade sur la suite des entrées (direction, gaz) à 100 Hz, notée par le temps.
- **B** : la ligne de P2, suivie par le pilote de P7.
- **La question** : A va-t-il plus vite que B, en trichant sur la physique (un tremblement qui exploite le modèle) ?
  Si oui, notre modèle a un défaut, comme les entrées qui tremblent révèlent celui du jeu.

## P7. Le pilote (J4)

- **Le modèle** : la bicyclette, avec un pneu qui sature (coefficients à chercher au cadrage de J4).
- **Les pilotes** : la poursuite pure (la règle à battre), le faisceau sur les prochains pas, l'escalade sur un plan
  de quelques pas comme sur Mad Pod Racing.
- **La mesure** : le temps au tour et l'écart à la ligne, sur les mêmes pistes, avec des perturbations tirées par
  graine (un coup de vent, une plaque glissante).

## P8. La pluie et les surfaces (J5)

Un μ par portion de piste et par météo. **La route mouillée d'abord** (Sami, 13/11 : « comme par exemple une route
mouillé ») : un μ plus bas partout, puis par endroits (une flaque, une portion à l'ombre). Les surfaces de Trackmania
(terre, glace) suivent si elles servent. **La question** : la ligne de P2 change-t-elle comme un pilote l'attend ? On
freine plus tôt, on cherche l'adhérence ailleurs. **Le modèle de la pluie** : un μ plus bas sur une bande autour de
la trajectoire sèche (le caoutchouc et l'asphalte poli y glissent le plus). L'optimiseur doit alors retrouver seul
la ligne de pluie des écoles : plus large à l'entrée, droite à la sortie ([questions.md](questions.md) § 4,
question 3).

**P8 bis, la voiture « à la Trackmania »** : peu de freins, beaucoup de dérapage. Sami : « il ne faut presque jamais
lever le pied ». Le même optimiseur doit retrouver ce style sur cette physique-là. C'est un bon test : la ligne vient
de la physique, pas de nos idées.

## P9. Sami aux commandes (J4-J5)

C'est la partie « raquette ». Sami pilote contre ses fantômes, celui de la ligne idéale, puis le pilote de P7.

- **Les commandes** (Sami, 13/11) : accélérer avec la flèche haut ou A, freiner avec Ctrl gauche, RB ou **la gâchette
  RT, analogique, pour le freinage dégressif**, tourner avec les flèches ou le stick gauche (analogique). Le clavier
  et la manette, tous deux dès J4. Le délai de la manette se mesure, et ce que le clavier perd sans frein dosé aussi.
- **Un repère de freinage** (un panneau à 100 m) sur la vue de face : c'est ainsi que les pilotes trouvent leur point
  de freinage ([questions.md](questions.md) § 4, question 1).
- **Les vues**, comme raquette : de dessus (la piste et les lignes), de profil (la vitesse le long du tour), de face
  (la voiture vue de derrière, pour piloter).
- Ses entrées passent par une fonction pure, pour que les tests les simulent.

**Ce que ça apporte** : le jeu lui-même, et un test humain du pilote (où gagne-t-il du temps sur la machine ?).

## P10. Plusieurs voitures (plus tard)

**Décidé le 13/11 : pas de collision**, comme dans Trackmania (Sami : « surement plus simple. la collission serait
complex a gérer »). Les autres voitures sont des fantômes : sa course précédente, la ligne idéale, le pilote robot.
Le dépassement et la ligne défensive (Liniger, Coders Strike Back) restent hors du projet tant que les voitures se
traversent.

## P11. La ligne et le réglage ensemble (plus tard)

Perantoni et Limebeer optimisent à la fois la ligne et des réglages de la voiture (aéro, rapports), et un réglage
propre à chaque piste fait gagner du temps. Avec CMA-ES, il suffit d'ajouter quelques gènes de réglage aux écarts.

## P12. L'auto-jeu (bien plus tard)

Linesight a battu dix records du monde sur douze par renforcement, au prix de centaines d'heures et d'un GPU. À
notre échelle : une valeur apprise pour couper le faisceau du pilote, comme raquette le prévoit. Seulement après
un pilote par recherche qui marche.
