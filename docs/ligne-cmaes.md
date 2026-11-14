# Le J2 : chercher la ligne par CMA-ES et par l'escalade

Commencé le 14/11/2026, après l'accord de Sami (« Ok pour les trois », [recherche/questions.md](recherche/questions.md)
§ 5). C'est la piste P2 de [recherche/pistes.md](recherche/pistes.md) : CMA-ES bat-il la courbure minimale, et
bat-il l'escalade ? Le modèle (la voiture, le profil, les références) est celui de [modele.md](modele.md).

## 1. La ligne en gènes, et pourquoi autour de la courbure minimale

**La forme** (`src/line/spline.js`) : un gène tous les 40 m environ, soit 58 à 175 gènes selon la piste (145 à
Monza). Une B-spline cubique périodique des gènes donne l'écart en chaque point de la piste. L'écart s'ajoute à une
ligne de base, puis il est rabattu sur les bornes. Un gène vaut une unité de « demi-largeur moyenne » de la piste
(5,4 m à Monza). Ainsi le pas initial de CMA-ES (σ = 0,3, fixé par P2) déplace la ligne d'un tiers de la largeur
utile.

**Le premier essai** gardait la ligne centrale comme base, et les gènes en part de la largeur locale. Il a échoué,
et l'échec est instructif. Les mesures sont sur Monza, avec 145 gènes :

| Ce qui est noté | Temps au tour |
|---|---|
| la ligne centrale de TU Munich, à 5 m | 91,35 s |
| le « centre » des gènes en part de largeur (tous les gènes à zéro) | 95,52 s |
| la courbure minimale (J1) | 81,05 s |
| la même, ajustée au mieux sur les gènes en part de largeur | 94,63 s |
| la même, ajustée sur des gènes en mètres autour du centre, à 10 / 20 / 40 / 80 m | 81,50 / 85,53 / 89,35 / 91,35 s |

- **Les largeurs de TU Munich sont bruitées** : elles viennent d'images satellite (leur README). Une ligne tracée en
  part de la largeur locale hérite de ce bruit.
- **La ligne centrale l'est aussi**, à l'échelle du pas de 5 m. La courbure minimale le compense par des écarts de
  quelques centimètres. Une spline de quelques dizaines de gènes ne peut pas les dessiner. Même ajustée à 7 cm près
  en moyenne quadratique (pas de 20 m), elle perd 4 s.
- **La solution** : chercher une correction lisse autour d'une ligne déjà lisse, la courbure minimale. Tous les gènes
  à zéro redonnent exactement 81,05 s. Le départ « centre » est la ligne centrale ajustée sur les gènes, soit une
  ligne centrale lissée (88,14 s à Monza).

**La note** (`src/search/line-score.js`) : moins le temps au tour du J1, sur tous les points de la piste (5 m), sans
allocation. Elle coûte environ 85 µs à Monza.

## 2. Le dispositif de mesure

`scripts/p2.js`, une tâche de la file par piste, puis `scripts/p2-summary.js` pour l'analyse :

- **les 25 pistes de TU Munich**, la F1 en point matériel, 1 m de demi-largeur ;
- **deux espacements de gènes**, 40 m et 80 m (la question de P3, abordée ici par deux points seulement) ;
- **deux départs** : la courbure minimale (la ligne à battre, que la recherche doit améliorer) et le centre lissé
  (la recherche retrouve-t-elle seule la ligne ?) ;
- **deux budgets**, 20 000 et 100 000 lignes notées. Ce sont deux recherches distinctes, car l'amplitude de
  l'escalade se règle sur son budget ;
- **trois graines** ;
- **CMA-ES** de la lib (σ = 0,3, ses réglages par défaut) contre **l'escalade** de la lib. L'escalade déplace un bloc
  de 1 à 3 gènes voisins d'un tirage normal de σ fois son amplitude, qui décroît de 1 à 0,1. Elle ne repart jamais
  d'une ligne au hasard.

**La comparaison** se fait par paires, sur la même piste et la même graine, avec l'intervalle à 95 % de `paired`.
« Gain » veut dire secondes gagnées sur la courbure minimale.

**Les essais d'avant la mesure** (une graine, 20 000 lignes) :

| Piste, gènes | Courbure min. | CMA-ES σ 0,3 / 0,1 / 0,03 | Escalade σ 0,3 / 0,1 / 0,03 |
|---|---|---|---|
| Monza, 145 (40 m) | 81,05 | 80,21 (centre : 80,24) | 79,87 (centre : 80,04) |
| Monza, 72 (80 m) | 81,05 | 80,85 / 80,80 / 80,83 | 80,69 / 80,70 / 80,72 |
| Budapest, 109 (40 m) | 74,94 | 73,36 / 73,52 / 73,52 | 73,07 / 73,12 / 73,25 |

Les deux recherches battent la courbure minimale, de 0,2 à 1,9 s. **L'escalade devance CMA-ES dans chaque essai**,
alors que l'hypothèse de P2 disait l'inverse. Le pas σ change peu le résultat. Le coût diffère aussi : CMA-ES ajoute
environ 220 µs par ligne à 145 gènes (son coût croît comme n²), plus que la note elle-même. L'escalade n'ajoute
presque rien.

## 3. Les résultats

Mesuré le 14/11 dans la file (25 tâches, 1 200 recherches, environ 20 min sur 18 fils). Chaque ligne du tableau
regroupe 25 pistes × 3 graines. « Gain » : secondes gagnées sur la courbure minimale, en moyenne. « CMA-ES − escalade »
est positif quand CMA-ES va plus vite. Le calcul est en secondes par recherche.

| Pas | Départ | Budget | Paires | Gain CMA-ES (s) | Gain escalade (s) | CMA-ES − escalade (s, IC 95 %) | CMA-ES gagne / perd | Calcul (s) CMA-ES / escalade |
|---|---|---|---|---|---|---|---|---|
| 40 m | centre | 20000 | 75 | 0,52 | 1,00 | -0,48 [-0,60 ; -0,36] | 8/67 | 6,8 / 2,0 |
| 40 m | centre | 100000 | 75 | 0,93 | 1,17 | -0,24 [-0,31 ; -0,18] | 7/68 | 34,3 / 10,2 |
| 40 m | courbure min. | 20000 | 75 | 0,82 | 1,19 | -0,37 [-0,43 ; -0,32] | 0/75 | 6,8 / 2,0 |
| 40 m | courbure min. | 100000 | 75 | 1,03 | 1,27 | -0,24 [-0,29 ; -0,19] | 0/75 | 35,3 / 10,4 |
| 80 m | centre | 20000 | 75 | -0,32 | -0,33 | 0,01 [-0,12 ; 0,14] | 25/50 | 3,2 / 2,0 |
| 80 m | centre | 100000 | 75 | 0,13 | -0,15 | 0,27 [0,14 ; 0,41] | 48/27 | 16,2 / 10,0 |
| 80 m | courbure min. | 20000 | 75 | 0,15 | 0,34 | -0,19 [-0,21 ; -0,17] | 0/75 | 3,2 / 2,0 |
| 80 m | courbure min. | 100000 | 75 | 0,29 | 0,38 | -0,10 [-0,12 ; -0,07] | 8/67 | 16,3 / 10,1 |

**Ce que la mesure tranche** :

1. **La recherche bat la courbure minimale sur les 25 pistes.** Le meilleur réglage est l'escalade à 40 m, partie de
   la courbure minimale, avec 100 000 lignes. Elle gagne 1,27 s en moyenne (1,65 % du tour) : de 0,16 s (IMS, un
   ovale) à 2,27 s (Silverstone). Les trois graines s'accordent à 0,16 s près sur chaque piste.
2. **L'hypothèse de P2 est réfutée sur ce dispositif : l'escalade bat CMA-ES.** À 40 m, l'escalade gagne dans les
   quatre configurations. L'intervalle exclut zéro, et CMA-ES ne gagne que 15 paires sur 300. L'écart est de 0,24
   à 0,48 s. En plus, l'escalade coûte 3,4 fois moins de calcul (10 s contre 35 s pour 100 000 lignes). CMA-ES ne
   gagne qu'à 80 m, depuis le centre, à 100 000 lignes (+0,27 s) : dans ce cas, les deux finissent à peine au niveau
   de la courbure minimale.
3. **Partie du centre lissé, l'escalade retrouve seule mieux que la courbure minimale** : à 40 m et 100 000 lignes,
   elle gagne 1,17 s en moyenne et passe sous la courbure minimale sur les 25 pistes.
4. **40 m vaut nettement mieux que 80 m** : 1,27 s contre 0,38 s, avec la même méthode et le même budget. La finesse
   compte plus que le budget. De 20 000 à 100 000 lignes, l'escalade à 40 m ne gagne plus que 0,08 s, et 0,05 s
   dans la seconde moitié de sa course. Elle plafonne, sur ce que 40 m de gènes savent dessiner.

**Pourquoi CMA-ES perd** (**hypothèse**, non mesurée) : une B-spline lie chaque gène à ses trois voisins seulement.
La corrélation utile est donc locale, et l'escalade la saisit en déplaçant un bloc de 1 à 3 gènes voisins. CMA-ES
doit apprendre une covariance de n² termes (145² ≈ 21 000) avec une population de 18. À 100 000 lignes, il apprend
encore : il passe de 0,82 à 1,03 s de gain entre 20 000 et 100 000 lignes. Le retour de codingame sur Mars Lander
(13/11) disait l'inverse pour une autre raison : là-bas, les gènes étaient entiers et la note en escalier. Ici, les
gènes sont réels, la note est continue, et CMA-ES perd quand même, par la taille du problème.

## 4. La suite proposée

- **P3, la finesse** : l'escalade à 20 m (environ 290 gènes), puis le grossier au fin (40 m, puis 20 m à partir de
  là). C'est elle qui plafonne aujourd'hui. CMA-ES n'est plus utile à cette taille : son coût croît comme n².
- **Le contrôle qualitatif de P2**, pas encore fait : la ligne trouvée prend-elle la corde plus tard que la courbure
  minimale devant les longues lignes droites ([recherche/questions.md](recherche/questions.md) § 4, question 4) ? Il
  faut repérer les cordes des deux lignes et les comparer. La page (J3) le montrera aussi.
- **CMA-ES dans un sous-espace** (une variante, si on veut lui donner sa chance) : le moins de gènes possible, par
  exemple les seuls gènes d'un virage à la fois. C'est la taille où la lib l'a mesuré meilleur (6 à 50 gènes).
