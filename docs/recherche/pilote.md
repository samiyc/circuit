# Le pilote : tenir la ligne pas à pas

Une ligne idéale ne suffit pas : il faut une voiture qui la suive, avec une physique qui glisse, et un jour un
adversaire. C'est la partie la plus proche de raquette, et de Mad Pod Racing chez codingame. Recherché le 13/11/2026.

## 1. La poursuite pure (la règle simple)

Le pilote vise un point de la ligne situé à une distance d'anticipation devant lui, et braque vers ce point. La
vitesse est celle du profil (§ 2 de [ligne-ideale.md](ligne-ideale.md)). La revue F1TENTH la range parmi les
méthodes classiques « optimisation de trajectoire, puis suivi ». Des travaux récents règlent même la distance
d'anticipation par apprentissage.

**Pour nous** : c'est **la règle à battre** côté pilote. Elle s'écrit en vingt lignes et se mesure sur les mêmes
pistes. Le réglage de la distance d'anticipation est un premier client pour la course aux configurations
(`mcts-race`) ou pour CMA-ES (deux ou trois gènes).

## 2. La commande prédictive (MPC, MPCC)

**Liniger, Domahidi et Morari (2015)**, « Optimization-based autonomous racing of 1:43 scale RC cars » (Optimal
Control Applications and Methods 36(5), p. 628-647 ; arXiv 1711.07300) :

- des voitures RC au 1/43 à plus de 3 m/s, en dérive, quand les pneus arrière saturent ;
- deux contrôleurs. Le premier est hiérarchique : un planificateur, puis un suivi par MPC non linéaire. Le second
  (le **MPCC**, *contouring control*) fusionne planification et suivi dans un seul problème non linéaire ;
- des modèles linéarisés le long de la trajectoire donnent des QP convexes, résolus par des solveurs embarqués à
  points intérieurs (FORCES), à 50 Hz ;
- les dépassements se font en changeant les contraintes selon la situation de course.

Une source secondaire en fait la référence fondatrice du MPCC en course.

**Pour nous** : l'idée de fond est celle de nos bots. À chaque pas, on optimise un plan sur un horizon court, on joue
le premier coup, et on recommence. Nous le faisons sans gradients : le faisceau (`beam`) ou l'escalade sur des plans
de quelques pas. La version à QP attendra le solveur.

## 3. Simuler et faire évoluer : Coders Strike Back et Mad Pod Racing

Le jeu de course de pods de CodinGame (Coders Strike Back, aujourd'hui Mad Pod Racing) est le cas que Sami et
codingame connaissent :

- **La méthode courante** (blog de CodinGame) : tester des chaînes d'actions dans un moteur du jeu, et les améliorer
  par un algorithme génétique.
- **Un exemple de répartition du temps** : 12 ms pour prédire le coureur adverse, puis 116 ms pour la trajectoire
  combinée de ses deux pods. Les premières dizaines de millisecondes sur des génomes aléatoires sont du temps perdu,
  d'où l'idée de faire évoluer l'adversaire d'abord. Selon un autre auteur, une bonne prédiction de l'adversaire vaut
  plus de 10 points.
- **Chez nous** : raquette rappelle que, sur Mad Pod Racing, une escalade sur des plans, contre un modèle fixe de
  l'adversaire, a gagné 80 parties sur 80 contre le bot précédent (`raquette/CLAUDE.md`).
- **pb4 et Agade** ont travaillé ensemble en 2017 sur l'apprentissage par renforcement pour Coders Strike Back
  (article « Nash DQN CSB »). Ce sont les mêmes qui ont fait Linesight sur Trackmania ([trackmania.md](trackmania.md)).

**Pour nous** : c'est le pilote de J4. La physique des pods est dans `mcts-codingame/mad-pod-racing/engine` : on la
lit, on ne l'importe pas. Un pod n'est pas une voiture (il pivote sur place, il n'a pas de pneus), donc on en garde la
boucle de recherche, pas le modèle.

## 4. Le modèle de voiture qui glisse

Le point matériel du profil de vitesse ne glisse pas. Pour un pilote, il faut :

- **le modèle bicyclette** (deux roues équivalentes, avant et arrière), le modèle classique de la dynamique latérale ;
- **un modèle de pneu** : un effort latéral qui croît avec l'angle de dérive, puis sature. La « formule magique » de
  Pacejka est la référence. Les voitures de Liniger dérivent quand les pneus arrière saturent (§ 2).

Les détails et coefficients sont **à chercher au cadrage de J4**. Rien n'est sourcé ici au-delà de l'existence de
ces modèles.

## 5. L'apprentissage par renforcement

- **GT Sophy** (Wurman et al., Nature 602, 10/02/2022, Sony AI) : apprentissage par renforcement profond, sans
  modèle et hors politique. L'agent a battu quatre des meilleurs pilotes de Gran Turismo Sport en duel, sur trois
  combinaisons voiture-piste, en respectant les règles de courtoisie de la course.
- **Trackmania** : Linesight et tmrl ([trackmania.md](trackmania.md)).

**Pour nous** : pas avant longtemps. Ces agents demandent des centaines d'heures de jeu et un GPU sérieux, et le GPU
de la machine est plafonné sous WSL (leçon du Fall Challenge). Une valeur apprise par auto-jeu, comme celle que
raquette prévoit, viendrait après un pilote par recherche qui marche.

## Sources

- Evans et al., revue F1TENTH, 2024 : <https://arxiv.org/abs/2402.18558>
- La distance d'anticipation apprise (pure pursuit), 2026 : <https://arxiv.org/abs/2603.28625>
- Liniger, Domahidi, Morari, 1:43 RC cars : <https://arxiv.org/abs/1711.07300>
- CodinGame, « Coders Strike Back contest report » et articles des meilleurs joueurs :
  <https://www.codingame.com/blog/coders-strike-back-contest-report/>,
  <https://www.codingame.com/blog/best-programmers-reveal-magic-code/>
- pb4, Agade, « Nash DQN CSB Article » : <https://github.com/pb4git/Nash-DQN-CSB-Article>
- Wurman et al., « Outracing champion Gran Turismo drivers with deep reinforcement learning », Nature 602, 2022 :
  <https://ai.sony/publications/outracing-champion-gran-turismo-drivers-with-deep-reinforcement-learning>
