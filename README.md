# Circuit

Une voiture sur un circuit en simulation : une piste (sa ligne centrale et sa largeur), une voiture dont les pneus
n'accrochent que jusqu'à un certain point, et la question de tout pilote, de kart, de F1 ou de Trackmania : quelle
trajectoire, quelle vitesse en chaque point, pour le meilleur temps au tour ? D'abord la ligne idéale, calculée hors
ligne ; puis un pilote qui la suit tour par tour, à la souris ou au clavier pour Sami, et contre lui.

Client de [`mcts-commun`](../mcts-commun/README.md). La recherche sera choisie par la mesure, contre la ligne la plus
courte, la ligne à courbure minimale et un pilote qui les suit (poursuite pure).

**État** : le dépôt existe, sans modèle. La recherche du cadrage est faite
([`docs/recherche/`](docs/recherche/README.md)) ; le premier jalon (J1) est dans
[`docs/recherche/pistes.md`](docs/recherche/pistes.md).

## Les commandes

| Commande | Ce qu'elle fait |
|---|---|
| `npm install` | installe les outils, relie `mcts-commun` et active le hook de commit |
| `npm run check` | le lint, les types, puis les tests ; c'est ce que lance le hook |
| `npm run lint` (`lint:fix`) | eslint, avec le budget de complexité de lopin |
| `npm run types` | tsc vérifie le JavaScript d'après ses commentaires JSDoc, sans rien compiler |
| `npm test` (`test:coverage`) | les tests de `node --test`, dont la longueur des `.md` |

Les règles du dépôt sont dans [`CLAUDE.md`](CLAUDE.md).
