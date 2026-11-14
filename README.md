# Circuit

Une voiture sur un circuit en simulation : une piste (sa ligne centrale et sa largeur), une voiture dont les pneus
n'accrochent que jusqu'à un certain point, et la question de tout pilote, de kart, de F1 ou de Trackmania : quelle
trajectoire, quelle vitesse en chaque point, pour le meilleur temps au tour ? D'abord la ligne idéale, calculée hors
ligne ; puis un pilote qui la suit tour par tour, à la souris ou au clavier pour Sami, et contre lui.

Client de [`mcts-commun`](../mcts-commun/README.md). La recherche sera choisie par la mesure, contre la ligne la plus
courte, la ligne à courbure minimale et un pilote qui les suit (poursuite pure).

**État** (14/11) : le J1 est fait. Il y a la piste au format de TU Munich, la F1 de leur `laptime-simulation` en
point matériel, le profil de vitesse (la note d'une ligne), les trois lignes de référence, leurs tests et le banc de
la note. Le modèle et ses mesures sont dans [`docs/modele.md`](docs/modele.md). Le J2 (14/11) cherche la ligne
([`docs/ligne-cmaes.md`](docs/ligne-cmaes.md)) : l'escalade du grossier au fin (des gènes tous les 40 m, puis 20 m,
puis 10 m), finie par une descente du temps au tour, bat la courbure minimale de 2,15 s en moyenne sur les
25 pistes ; CMA-ES ne fait au mieux que l'égaler l'escalade. La recherche du cadrage est dans
[`docs/recherche/`](docs/recherche/README.md), les jalons suivants dans [`docs/recherche/pistes.md`](docs/recherche/pistes.md).

## Les commandes

| Commande | Ce qu'elle fait |
|---|---|
| `npm install` | installe les outils, relie `mcts-commun` et active le hook de commit |
| `npm run tracks` | télécharge les 25 pistes de TU Munich dans `data/tum/` (ignoré par git) ; à lancer une fois |
| `npm run references [Piste…]` | les trois lignes de référence et leurs temps au tour, contre la ligne de TU Munich (long : par la file) |
| `npm run bench` | le coût d'un temps au tour, par tour et par point, et ce qu'il alloue |
| `npm run search-bench [-- budget=… seeds=… spacings=40,20 Piste…]` | la recherche de référence (du grossier au fin, 40, 20 puis 10 m) sur trois pistes : son gain et son coût |
| `npm run check` | le lint, les types, puis les tests ; c'est ce que lance le hook |
| `npm run lint` (`lint:fix`) | eslint, avec le budget de complexité de lopin |
| `npm run types` | tsc vérifie le JavaScript d'après ses commentaires JSDoc, sans rien compiler |
| `npm test` (`test:coverage`) | les tests de `node --test`, dont la longueur des `.md` |

Les règles du dépôt sont dans [`CLAUDE.md`](CLAUDE.md).
