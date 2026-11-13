# Trackmania : ce qu'il apprend au projet

Sami a longtemps joué à Trackmania. Ce fichier rassemble ce que la communauté et la recherche en savent, et ce qui
peut servir chez nous. Recherché le 13/11/2026. Beaucoup de sources sont communautaires (forums, blogs d'outils) :
elles sont signalées comme telles.

**La règle** : Trackmania est un jeu fermé, et sa physique n'est pas publique. Nous ne nous branchons pas sur le jeu
(ni greffon, ni automatisation, ni lecture de mémoire). Il nous inspire, il ne nous sert pas de banc.

## 1. Sa physique, vue de l'extérieur

D'après des sources communautaires, pas une documentation de Nadeo :

- **Déterministe** : le moteur physique est entièrement déterministe, et un replay ne contient que les entrées et
  leurs instants (enquête de donadigo sur les replays de TMX ; forum TASVideos).
- **100 Hz** : la physique tourne à 100 pas par seconde, soit 10 ms par pas, dans toutes les versions (fil Reddit
  r/TrackMania, avril 2025). C'est ce pas fixe qui rend les replays rejouables.
- **La direction analogique** est un entier par pas. Une analyse cite l'intervalle −65 536 à 65 536.

**Pour nous** : un pas fixe de 10 ms et une simulation déterministe, c'est exactement notre règle « le hasard est
semé, tout se rejoue ». Une partie se résume à ses entrées, comme nos parties se résument à leur graine. **Hypothèse
à décider en J4** : notre pilote joue lui aussi à 100 Hz.

## 2. Les TAS et le *bruteforce* : une escalade

**TMInterface** est l'outil de TAS (*tool-assisted speedrun*) de Trackmania Nations Forever et United Forever
(TASVideos). Il offre des sauvegardes d'état, la gestion des entrées, et un module de *bruteforce*.

- **Le principe** : partir d'un replay, perturber les entrées au hasard, garder la perturbation si elle améliore
  la cible (un temps, une position à un instant), et recommencer. On choisit dans l'interface la cible et le point
  à optimiser.
- **Les greffons** (collection de SaiMoen) ajoutent des modes : incrémental (d'un instant de départ à un instant de
  fin), *finetuner*.
- **Un effet visible** : les entrées des TAS tremblent, et c'est un artefact de la méthode plus qu'une nécessité
  (blog de SaiMoen). Le *steering* étendu a été retiré de TMInterface 2.1, pour que les résultats restent jouables.

**Pour nous** : c'est **notre `climb`**, appliqué à une suite d'entrées au lieu d'une ligne. La leçon pour la piste
P6 : optimiser des entrées pas à pas donne des commandes qui tremblent. Optimiser une ligne lisse, puis la suivre,
donne des commandes propres. Les deux se comparent.

## 3. Les IA de Trackmania

- **Linesight** (pb4 et Agade) : un agent par apprentissage par renforcement sur Trackmania Nations Forever, open
  source. D'après sa documentation, il a battu **dix des douze records du monde prestigieux** de la campagne
  officielle. Une variante communautaire documente l'algorithme par défaut, IQN (un apprentissage distributionnel
  hors politique). Le dépôt public change volontairement quelques hyperparamètres par rapport au dépôt privé.
  pb4 et Agade sont des noms de CodinGame : ils avaient appliqué le renforcement à Coders Strike Back en 2017.
- **tmrl** (Yann Bouteiller et Edouard Geze, Polytechnique Montréal) : un cadre Python pour Trackmania 2020, avec un
  environnement Gymnasium, SAC puis REDQ. Le mode « LIDAR » est calculé sur des captures d'écran, et ne marche que sur
  une route simple à bords noirs. Il organise la *TrackMania Roborace League*. En 2022, lors d'un match télévisé, leur
  politique LIDAR, entraînée 200 heures, a perdu contre des joueurs professionnels : environ 45,5 s contre une cible
  « surhumaine » d'environ 32 s.
- **Yosh** (vidéaste) : son IA a fait 23,75 s sur A01, la première piste du jeu, dont le record humain de 23,79 s
  tenait depuis deux ans (Dexerto). L'article dit aussi qu'il a trouvé ensuite, avec d'autres outils, un défaut de
  jointure de la route. C'est un projet distinct de Linesight.

**Pour nous** : la preuve que des records humains tombent face à une machine sur un vrai jeu de course. Mais à
quel prix : des centaines d'heures de jeu, un GPU, une interface avec le jeu. Hors de notre portée, et hors de notre
règle (pas de branchement sur le jeu).

## 4. La théorie : Trackmania est NP-complet

**Dernoncourt (2014)**, « TrackMania is NP-complete » (arXiv 1411.5765) : finir une piste sans limite de temps est
NP-complet dans Trackmania Nations Forever, par réduction depuis 3-SAT (des gadgets de variable, de clause et de
croisement, publiés sur GitHub). L'auteur pense que la preuve tient pour les autres jeux de la série.

**Pour nous** : une curiosité, sans conséquence pratique. Nos pistes sont des boucles sans choix de chemin, et la
difficulté est continue (où passer), pas combinatoire (quel embranchement).

## 5. Ce que Trackmania suggère comme pistes

Ce sont des idées, à faire valider par Sami ([questions.md](questions.md)) :

- **Les surfaces** : l'asphalte, la terre, l'herbe, la glace ont des adhérences différentes. Chez nous, c'est un μ
  par portion de piste. La ligne change : on coupe moins sur la glace.
- **Le fantôme** : courir contre le fantôme de la ligne idéale. C'est l'écran de J3 et le jeu de Sami en J4.
- **Le dérapage** : passer un virage en glissant. Il faut un modèle de pneu qui sature ([pilote.md](pilote.md) § 4).
- **Les points de passage** (*checkpoints*) : des temps intermédiaires, utiles pour dire où une ligne perd du temps.

## Sources

- Enquête sur les replays de TMX (donadigo) : <https://donadigo.com/tmx1>
- TASVideos, « Trackmania Nations/United are now internally TASable » : <https://tasvideos.org/Forum/Topics/22766>
- SaiMoen, greffons et blog de TMInterface : <https://sai-moen.github.io/TMInterface-AS-SaiMoen/blog/bf_intuition>,
  <https://sai-moen.github.io/TMInterface-AS-SaiMoen/blog/simplifier>
- Fil r/TrackMania sur les 100 Hz (avril 2025), cité par plusieurs réponses ; source communautaire.
- Linesight : <https://linesight-rl.github.io/linesight/build/html>
- tmrl : <https://github.com/trackmania-rl/tmrl>
- Histoire de l'apprentissage automatique dans Trackmania (Hall of Dreams) : <https://hallofdreams.org/posts/trackmania-1/>
- Yosh et A01 (Dexerto) : <https://jamtest.dexerto.com/gaming/youtuber-uses-ai-to-shatter-trackmanias-untouchable-record-3246676>
- Dernoncourt, « TrackMania is NP-complete » : <https://arxiv.org/abs/1411.5765>
