# Le J2 : chercher la ligne par CMA-ES et par l'escalade, puis plus finement

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

## 4. CMA-ES encore : la population, le pas, les fenêtres

Demandé par Sami le 14/11 (« Test encore cma-es »). `scripts/p3.js Piste cmaes`, puis `scripts/p3-summary.js`. Le
dispositif est celui du § 2 : les 25 pistes, 3 graines, des gènes tous les 40 m, le départ sur la courbure minimale,
20 000 et 100 000 lignes. Trois variantes de CMA-ES, chacune contre l'escalade sur la même piste et la même graine :

- **une population 4 fois plus grande** (72 plans par génération à Monza au lieu de 18) : plus de plans pour estimer
  la covariance ;
- **un pas σ de 0,1** au lieu de 0,3 ;
- **CMA-ES par fenêtres** (`src/search/window-cmaes.js`) : 12 gènes voisins à la fois, les autres tenus à la
  meilleure ligne. Chaque fenêtre dispose de 400 lignes, puis la suivante glisse de 6 gènes, en faisant le tour de la
  piste. Le pas décroît de σ à σ/10 au fil du budget, comme l'amplitude de l'escalade. C'est la taille où la lib a
  mesuré CMA-ES à son meilleur (6 à 50 gènes).

Mesuré le 14/11 dans la file (25 tâches, 600 recherches). « CMA-ES − escalade » est positif quand CMA-ES va plus vite.

| Variante | Budget | Gain (s) | CMA-ES − escalade (s, IC 95 %) | gagne / perd | Calcul (s) |
|---|---|---|---|---|---|
| l'escalade (la référence) | 20000 | 1,19 | – | – | 2,0 |
| population × 4 | 20000 | 0,71 | -0,48 [-0,54 ; -0,42] | 0/75 | 3,9 |
| σ = 0,1 | 20000 | 0,95 | -0,25 [-0,27 ; -0,22] | 0/75 | 6,6 |
| par fenêtres de 12 | 20000 | 1,14 | -0,05 [-0,06 ; -0,04] | 10/65 | 2,0 |
| l'escalade (la référence) | 100000 | 1,27 | – | – | 9,9 |
| population × 4 | 100000 | 1,14 | -0,13 [-0,15 ; -0,11] | 0/75 | 19,4 |
| σ = 0,1 | 100000 | 1,09 | -0,18 [-0,20 ; -0,15] | 1/74 | 33,3 |
| par fenêtres de 12 | 100000 | 1,27 | 0,01 [-0,00 ; 0,01] | 34/41 | 10,2 |

**Ce que la mesure tranche** :

1. **CMA-ES sur tous les gènes perd toujours**, quels que soient sa population et son pas. Au mieux, il perd
   0,13 s à 100 000 lignes, et il ne gagne qu'une paire sur 300. La grande population apprend plus lentement au
   début (0,71 s de gain à 20 000 lignes, contre 0,82 s avec la population par défaut au § 3). Elle coûte deux fois
   moins de calcul par ligne, car elle fait moins de décompositions de la covariance.
2. **Par fenêtres de 12 gènes, CMA-ES rejoint l'escalade** : 0,05 s derrière à 20 000 lignes, à égalité à 100 000
   (l'intervalle contient zéro, 34 paires gagnées sur 75), pour le même temps de calcul. Il ne la dépasse pas.
3. **Cela confirme l'hypothèse du § 3** : CMA-ES perdait par la taille du problème, pas par la forme du paysage. À
   12 gènes, il vaut l'escalade. Sur cette note, rien ne le fait passer devant.

## 5. Le contrôle de P2 : la corde avant les lignes droites

La question 4 de [recherche/questions.md](recherche/questions.md) § 4 : la ligne trouvée prend-elle la corde plus tard
que la courbure minimale devant une longue ligne droite ? La théorie du pilotage dit oui : une corde tardive sacrifie
l'entrée du virage pour sortir plus vite, et ce gain se garde sur toute la ligne droite.

**Le repérage** (`src/analysis/corners.js`, testé) :

- **un virage** est une suite d'au moins 3 points (15 m) où la courbure minimale tourne du même côté, sous 400 m de
  rayon ;
- **sa corde**, pour une ligne, est le milieu des points où cette ligne passe au plus près du bord intérieur (à 5 cm
  près), dans le virage ou à 10 points de part et d'autre ;
- **le décalage** est la distance le long de la piste entre la corde de la ligne trouvée et celle de la courbure
  minimale. Il est positif quand la ligne trouvée la prend plus tard. Une corde est « déplacée » au-delà de 2 m ;
- **la vitesse de sortie gagnée** est l'écart de vitesse entre les deux lignes au dernier point du virage.

La ligne trouvée est celle de l'escalade à 40 m, avec 100 000 lignes et la graine 1, sur les 25 pistes (330 virages) :

| Ligne droite après (m) | Virages | Corde déplacée | dont plus tard | Décalage moyen (m) | Vitesse de sortie gagnée (km/h) |
|---|---|---|---|---|---|
| 0 à 100 | 182 | 86 | 39 | -6,7 | 4,8 |
| 100 à 300 | 65 | 34 | 24 | 16,2 | 5,7 |
| 300 à 600 | 46 | 27 | 14 | 13,8 | 3,6 |
| 600 et plus | 37 | 19 | 15 | 47,2 | 1,7 |

**Ce qu'on en tire** :

1. **Oui, la corde recule devant les longues lignes droites.** Devant plus de 600 m de ligne droite, 15 cordes
   déplacées sur 19 le sont vers plus tard, de 47 m en moyenne. Devant moins de 100 m, c'est 39 sur 86, et le
   décalage moyen est légèrement vers plus tôt (−6,7 m). Les plus grands reculs : Budapest (205 m avant 730 m de
   ligne droite), Monza (la Parabolica, 189 m avant 1 215 m), Suzuka (135 m avant 696 m).
2. **La tendance n'est pas nette entre les deux** : 71 % des cordes déplacées reculent entre 100 et 300 m, mais 52 %
   seulement entre 300 et 600 m. Les petits effectifs (27 et 19 virages) rendent ces parts fragiles.
3. **La vitesse de sortie est un mauvais indicateur, tel que mesuré.** Elle gagne en moyenne dans chaque classe,
   mais moins devant les longues lignes droites (1,7 km/h). Elle est prise au dernier point du virage de la courbure
   minimale. Quand la ligne trouvée prend la corde 100 à 200 m plus tard, ce point tombe encore dans son virage à
   elle. Il faudrait comparer le temps passé sur la ligne droite qui suit. Je ne l'ai pas fait.
4. **La forme de la ligne compte aussi** : la moitié des cordes (164 sur 330) ne bougent pas de plus de 2 m. Le gain
   de la recherche vient alors de l'entrée ou de la sortie du virage, pas de la corde elle-même.

## 6. P3 : la finesse de la ligne, et du grossier au fin

`scripts/p3.js Piste fine`, le même dispositif (25 pistes, 3 graines, départ sur la courbure minimale), avec
l'escalade seule, à 100 000 et 300 000 lignes :

- **l'escalade à 40, 20 et 10 m** entre les gènes (145, 290 et 579 gènes à Monza) ;
- **du grossier au fin** (`src/search/refine.js`) : l'escalade à 40 m, puis sa ligne ajustée sur des gènes à 20 m et
  reprise par l'escalade (« 40 → 20 ») ; ou bien 80 m, puis 40, puis 20 (« 80 → 40 → 20 »). Le budget est partagé
  en parts égales entre les étapes.

Mesuré le 14/11 dans la file (25 tâches, 750 recherches). La référence est l'escalade à 40 m, le meilleur réglage
du § 3. « − 40 m » est positif quand la méthode va plus vite que cette référence.

| Méthode | Budget | Gain (s) | − 40 m (s, IC 95 %) | gagne / perd | Calcul (s) |
|---|---|---|---|---|---|
| escalade, 40 m | 100000 | 1,27 | – | – | 9,5 |
| escalade, 20 m | 100000 | 1,69 | 0,43 [0,36 ; 0,50] | 69/6 | 9,7 |
| escalade, 10 m | 100000 | 1,30 | 0,03 [-0,10 ; 0,16] | 38/37 | 9,7 |
| 40 → 20 | 100000 | 1,79 | 0,52 [0,46 ; 0,58] | 73/2 | 9,7 |
| 80 → 40 → 20 | 100000 | 1,78 | 0,51 [0,45 ; 0,57] | 73/2 | 9,8 |
| escalade, 40 m | 300000 | 1,29 | – | – | 29,1 |
| escalade, 20 m | 300000 | 1,75 | 0,46 [0,39 ; 0,53] | 72/3 | 28,9 |
| escalade, 10 m | 300000 | 1,47 | 0,18 [0,06 ; 0,31] | 44/31 | 29,0 |
| 40 → 20 | 300000 | 1,82 | 0,54 [0,47 ; 0,60] | 74/1 | 29,0 |
| 80 → 40 → 20 | 300000 | 1,81 | 0,53 [0,46 ; 0,59] | 72/3 | 29,0 |

Les comparaisons directes, par paires :

| Comparaison | Budget | Écart (s, IC 95 %) | gagne / perd |
|---|---|---|---|
| 40 → 20 contre l'escalade à 20 m | 100000 | 0,09 [0,06 ; 0,13] | 62/13 |
| 40 → 20 contre l'escalade à 20 m | 300000 | 0,08 [0,05 ; 0,10] | 61/14 |
| 80 → 40 → 20 contre 40 → 20 | 100000 | -0,01 [-0,02 ; -0,00] | 25/50 |
| 80 → 40 → 20 contre 40 → 20 | 300000 | -0,01 [-0,02 ; -0,00] | 19/56 |
| l'escalade à 10 m contre 20 m | 300000 | -0,28 [-0,38 ; -0,18] | 15/60 |

**Ce que la mesure tranche** :

1. **20 m vaut mieux que 40 m** : 0,43 s de plus à 100 000 lignes, pour le même calcul. La ligne plafonnait au § 3
   sur ce que 40 m de gènes savent dessiner, et c'était bien la finesse qui manquait.
2. **10 m, c'est trop de gènes pour ces budgets.** À 100 000 lignes, l'escalade à 10 m ne fait pas mieux qu'à 40 m,
   et ses graines s'écartent jusqu'à 0,30 s sur une même piste. À 300 000 lignes, elle gagne encore 0,38 s dans la
   seconde moitié de sa course : elle n'a pas fini, mais reste 0,28 s derrière 20 m.
3. **Du grossier au fin gagne** : « 40 → 20 » est le meilleur réglage mesuré. Il gagne 1,79 s sur la courbure
   minimale avec 100 000 lignes (10 s de calcul par piste), et bat l'escalade à 20 m seule de 0,09 s. Il passe sous
   la courbure minimale sur les 25 pistes : de 0,16 s (IMS) à 3,05 s (Melbourne), et les trois graines s'accordent à
   0,08 s près sur chaque piste.
4. **Une étape de plus ne sert à rien** : « 80 → 40 → 20 » perd 0,01 s contre « 40 → 20 ». L'étape à 80 m prend un
   tiers du budget pour un travail que l'étape à 40 m fait elle-même.
5. **Le budget ne compte presque plus** : de 100 000 à 300 000 lignes, « 40 → 20 » ne gagne que 0,03 s. À 20 m,
   la ligne plafonne à son tour.

**La course aux configurations** (`mcts-race`, prévue par P3) n'a pas servi : la mesure complète, par paires sur les
25 pistes, coûte une heure de file et tranche nettement.

## 7. Jusqu'à 10 m : « 40 → 20 → 10 »

Accordé par Sami le 14/11 (« OK pour la suite et le banc »). `scripts/p3.js Piste finer`, le dispositif du § 6 :
du grossier au fin jusqu'à des gènes tous les 10 m, en trois étapes (« 40 → 20 → 10 ») ou en deux (« 20 → 10 »),
contre « 40 → 20 », le meilleur réglage du § 6. Mesuré le 14/11 dans la file (25 tâches, 450 recherches).

| Méthode | Budget | Gain (s) | − « 40 → 20 » (s, IC 95 %) | gagne / perd | Calcul (s) |
|---|---|---|---|---|---|
| 40 → 20 | 100000 | 1,79 | – | – | 9,6 |
| 40 → 20 → 10 | 100000 | 2,00 | 0,21 [0,17 ; 0,25] | 72/3 | 9,8 |
| 20 → 10 | 100000 | 1,88 | 0,09 [0,03 ; 0,15] | 53/22 | 9,7 |
| 40 → 20 | 300000 | 1,82 | – | – | 29,2 |
| 40 → 20 → 10 | 300000 | 2,06 | 0,24 [0,20 ; 0,28] | 75/0 | 29,2 |
| 20 → 10 | 300000 | 1,97 | 0,15 [0,09 ; 0,20] | 59/16 | 29,2 |

**Ce que la mesure tranche** :

1. **« 40 → 20 → 10 » est le meilleur réglage mesuré** : 2,00 s gagnées sur la courbure minimale à 100 000 lignes
   (10 s de calcul par piste), 0,21 s de mieux que « 40 → 20 ». Il passe sous la courbure minimale sur les
   25 pistes, de 0,16 s (IMS) à 3,05 s (Melbourne). Les graines s'accordent à 0,12 s près sur chaque piste.
2. **Les 10 m servent quand on y arrive par étapes** : l'escalade à 10 m seule ne faisait pas mieux qu'à 40 m (§ 6),
   « 20 → 10 » gagne 0,09 s sur « 40 → 20 », et « 40 → 20 → 10 » 0,21 s.
3. **Le budget compte peu** : de 100 000 à 300 000 lignes, « 40 → 20 → 10 » gagne 0,06 s.

C'est désormais la recherche de référence : celle du banc (`npm run search-bench`, 2,04 / 2,74 / 2,94 s à Monza,
Budapest et Silverstone) et celle contre laquelle se mesure P4.

## 8. P4 : un pas convexe contre la recherche

**Ce que fait Stanford** (Kapania, Subosits et Gerdes, [arXiv 1902.00606](https://arxiv.org/html/1902.00606v1),
éq. 15) : l'étape 2 minimise Σκ², la courbure seule, **sans pondération par la vitesse**, sous les bornes de la piste.
La vitesse n'y entre que par le modèle de vélo à pneus linéarisés qui relie le braquage à la ligne. Pour notre point
matériel, cette étape redonne exactement la courbure minimale du J1 : leur première itération est notre référence, et
les suivantes n'y changent rien. [recherche/pistes.md](recherche/pistes.md) annonçait « la courbure pondérée par la
vitesse » : c'était notre lecture, pas leur méthode.

**Deux pas essayés à Monza** (des prototypes, une piste) :

- **la courbure pondérée par ce qu'elle coûte en temps** : chaque point pèse la sensibilité du temps au tour à sa
  courbure, prise sur le profil. Le pas fait pire que la courbure minimale (de 86 à 95 s selon le plancher des poids, contre 81,05 s), même
  limité à 1 cm (81,36 s) : la ligne ondule là où les poids sont faibles. Avec des poids lissés sur ±300 m, il gagne
  0,07 s au mieux. Abandonné ;
- **la descente du temps au tour** (`src/search/time-descent.js`, testée) : le gradient du temps au tour en chaque
  écart, par différences centrées (2n temps au tour, n les points de la piste), puis le pas qui minimise
  gᵀd + ½·c·(Σ dsᵢ·(Jd)ᵢ² + δ·|d|²) dans la piste, J la courbure linéarisée (`src/line/curvature-model.js`). Un
  pas courbe la ligne au prix de sa courbure, la métrique de la courbure minimale. C'est un problème convexe, résolu
  par `descend`. La raideur c est une région de confiance : divisée par 2 après un pas qui gagne, multipliée par 4
  après un pas qui perd. Le temps au tour n'est pas lisse (le profil prend des minima), donc les pas restent de
  l'ordre du millimètre. Le QP de la lib n'a pas servi : il est dense, et `descend` suffit pour des bornes seules.

**La mesure** (`scripts/p4.js`, puis `scripts/p4-summary.js`) : les 25 pistes, 3 graines pour la recherche (la
descente ne tire rien), à temps au tour notés égaux. Mesuré le 14/11 dans la file (25 tâches).

| Méthode | Gain moyen (s) | Le moins / le plus (s) | Calcul (s) |
|---|---|---|---|
| la descente depuis la courbure minimale, 100 000 | 0,80 | 0,04 / 1,88 | – |
| la même, 300 000 | 0,96 | 0,04 / 2,39 | 25,6 |
| 40 → 20 → 10, 100 000 | 2,00 | 0,16 / 3,09 | 9,8 |
| 40 → 20 → 10, 200 000 | 2,04 | 0,16 / 3,14 | 19,5 |
| 40 → 20 → 10 (100 000), puis la descente (100 000) | 2,15 | 0,16 / 3,38 | 9,8 + 9,0 |

| Comparaison | Écart (s, IC 95 %) | gagne / perd |
|---|---|---|
| la descente contre 40 → 20 → 10, à 100 000 | -1,19 [-1,31 ; -1,08] | 0/75 |
| 40 → 20 → 10 puis la descente contre 40 → 20 → 10, à 200 000 | 0,11 [0,09 ; 0,13] | 72/3 |
| 40 → 20 → 10 à 200 000 contre 100 000 | 0,04 [0,03 ; 0,05] | 67/8 |

Les 75 paires de la première comparaison ne comptent que 25 descentes (une par piste) : son intervalle est trop
étroit, mais l'écart est sans appel (aucune paire gagnée).

**Ce que la mesure tranche** :

1. **Le pas convexe seul ne bat pas la recherche** : parti de la courbure minimale, il gagne 0,80 s à 100 000 temps
   au tour, contre 2,00 s pour « 40 → 20 → 10 ». Il s'arrête sur un coin du temps au tour, loin du meilleur.
2. **Il sert en finition** : après « 40 → 20 → 10 », 100 000 temps au tour de descente gagnent 0,11 s de plus que
   100 000 lignes de recherche, sur 72 paires sur 75. La descente travaille point par point (5 m), plus fin que les
   gènes à 10 m. « 40 → 20 → 10 puis la descente » gagne 2,15 s sur la courbure minimale, le meilleur réglage
   mesuré, en 19 s de calcul par piste.
3. **La question de P4 est donc tranchée sur ce modèle** : un pas convexe ne remplace pas la recherche, il la finit.
   Le pas de Stanford lui-même (Σκ² seul) est notre courbure minimale, battue de 2 s.

## 9. La suite proposée

- **La page (J3)** : montrer les lignes (courbure minimale, recherche, finition) et leurs cordes, virage par virage,
  et le recul de la Parabolica.
- **Le pilote (J4, P6-P7)** : suivre la ligne tick par tick ; la ligne est maintenant assez bonne pour qu'on lui
  demande d'être tenue.
- **Ce qui reste ouvert sur la ligne** : le modèle de la voiture (point matériel, ni rapports ni transfert de charge,
  décidé par Sami le 14/11) borne ce que ces gains valent pour une vraie F1. Un modèle plus riche referait P2 à P4.
