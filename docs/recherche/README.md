# La recherche du cadrage

Ce dossier rassemble tout ce qui a été cherché avant d'écrire une ligne de code. Le travail a été fait le 13/11/2026
par la session `commun`, à la demande de Sami : « lance le projet et trace toutes tes recherches dans les docs du
nouveau projet ». Chaque chiffre a sa source. Ce qui n'est pas sourcé est marqué **hypothèse**.

## La question

Une piste, c'est une ligne centrale et une largeur. Une voiture n'accroche que jusqu'à un certain point. Quelle
trajectoire, et quelle vitesse en chaque point, donnent le meilleur temps au tour ? C'est la question du kart, de la F1
et de Trackmania, à des physiques près.

Le problème se coupe en trois couches, et la littérature les traite à part :

1. **La ligne** (hors ligne) : où passer. Une ligne, c'est un écart latéral en N points du tour, donc N nombres
   bornés par la largeur de la piste.
2. **Le profil de vitesse** d'une ligne donnée : la vitesse que l'adhérence permet en chaque point, puis une passe
   avant (l'accélération) et une passe arrière (le freinage). Le temps au tour en sort. C'est la **note** de la
   ligne, et elle coûte quelques microsecondes.
3. **Le pilote** (en ligne) : tenir la ligne pas à pas, avec une voiture qui glisse, des surfaces qui changent, un
   adversaire. C'est la partie « raquette » : un robot, et Sami aux commandes contre lui.

## Les fichiers

| Fichier | Ce qu'il contient |
|---|---|
| [ligne-ideale.md](ligne-ideale.md) | l'état de l'art de la ligne et du profil de vitesse : la plus courte, la courbure minimale, les deux étapes de Stanford, le temps minimal en commande optimale (F1), les algorithmes génétiques, l'optimisation bayésienne |
| [pilote.md](pilote.md) | le pilote en ligne : poursuite pure, commande prédictive (MPCC), simulation et évolution (Coders Strike Back, Mad Pod Racing), apprentissage par renforcement (GT Sophy) |
| [trackmania.md](trackmania.md) | ce que Trackmania apprend : sa physique à 100 Hz, le *bruteforce* des TAS (une escalade !), les IA Linesight et tmrl, la preuve de NP-complétude |
| [bancs.md](bancs.md) | les pistes publiques (la base de TU Munich, F1TENTH, TORCS) et nos pistes tirées par graine |
| [pistes.md](pistes.md) | les expériences à mener, classées, avec ce que chacune doit trancher |
| [questions.md](questions.md) | les réponses de Sami (le joueur, 13/11) et les questions pour un professionnel (pilote, mécanicien) |

## Ce qu'on a déjà, ce qui est neuf

| Couche | Dans la lib (`mcts-commun`) | Neuf |
|---|---|---|
| La ligne | **CMA-ES** (`cmaes.js`, 13/11) : deux écarts voisins bougent ensemble, c'est la vallée en biais où il excelle ; l'escalade (`climb`) en comparaison ; la course (`mcts-race`) pour trier les variantes | l'optimisation à gradients sous contraintes : un programme quadratique (QP) pour la courbure minimale, un programme non linéaire (NLP) pour le temps minimal. `reseau` en aura besoin aussi (le DC-OPF) |
| Le profil de vitesse | rien | la passe avant-arrière sous le cercle d'adhérence : simple, quelques dizaines de lignes |
| Le pilote | le faisceau (`beam`), l'escalade sur des plans de quelques pas, comme les bots de Mad Pod Racing | un modèle de voiture qui glisse (modèle bicyclette, pneus) ; la commande prédictive |

**La physique n'est pas dans la lib.** Celle des pods de Mad Pod Racing est dans `mcts-codingame`
(`mad-pod-racing/engine`). On la lit et on copie ce qui sert, sans l'importer.

## Le chemin proposé

Le détail est dans [pistes.md](pistes.md). En bref :

1. **J1, le socle mesurable** : une piste (format TUM), le profil de vitesse d'un point matériel, trois lignes de
   référence (le centre, la plus courte, la courbure minimale) et leurs temps au tour.
2. **J2, la première vraie question** : CMA-ES sur les écarts, noté par le temps au tour, contre l'escalade et contre
   la courbure minimale. La ligne doit prendre les virages extérieur-corde-extérieur sans qu'on le lui dise.
3. **J3, la page**, comme raquette : la piste vue de dessus, la ligne colorée par la vitesse, le profil de
   vitesse, le fantôme qui tourne.
4. **J4, le pilote** : une voiture qui glisse, un pilote qui suit la ligne, puis Sami au clavier et à la manette
   contre les fantômes (sans collision).
5. **Plus tard** : la pluie et les surfaces, la voiture « à la Trackmania », l'auto-jeu.
