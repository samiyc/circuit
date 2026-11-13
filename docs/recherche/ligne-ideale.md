# La ligne idéale et le profil de vitesse

L'état de l'art, recherché le 13/11/2026. Pour chaque méthode : ce qu'elle fait, ce qu'elle coûte, et ce qu'elle
nous apporte. Les sources sont en fin de fichier.

## 1. Le problème, posé comme tout le monde le pose

- **La piste** : une ligne centrale échantillonnée (x, y) et, en chaque point, la largeur à droite et à gauche.
  C'est exactement le format de la base de TU Munich ([bancs.md](bancs.md)).
- **La ligne** : en chaque point i de la ligne centrale, un écart latéral αᵢ le long de la normale, borné par les
  largeurs (moins une demi-largeur de voiture). Avec N points, une ligne est un vecteur de N nombres bornés.
- **Sa note** : le temps au tour, calculé par le profil de vitesse (§ 2). D'autres notes approchées existent : la
  longueur (§ 3) et la courbure (§ 4).

## 2. Le profil de vitesse d'une ligne donnée

C'est la brique dont tout le reste dépend. Elle est simple, et c'est la note de toutes les recherches de ligne.

1. **La vitesse limite en virage** : pour un point matériel, l'accélération latérale v²·κ ne dépasse pas ce que
   permet l'adhérence (μ·g). D'où v ≤ √(μ·g / |κ|), avec κ la courbure de la ligne en ce point.
2. **La passe avant** : partir de la vitesse la plus basse et accélérer point après point, sous la limite du moteur
   et sous ce que le cercle d'adhérence laisse une fois le virage payé.
3. **La passe arrière** : de même à rebours, pour le freinage.
4. **Le temps** : la somme des longueurs de segment divisées par les vitesses.

Kapania, Subosits et Gerdes s'en servent dans leur méthode en deux étapes : une intégration avant-arrière sous les
limites de frottement des pneus (§ 5).

**Les raffinements connus** :
- **Le diagramme g-g** : la forme réelle du domaine d'accélération (longitudinale × latérale). Avec l'appui
  aérodynamique, il dépend de la vitesse (g-g-v). Werner et al. (2025) y ajoutent l'accélération verticale.
- **Les méthodes avant-arrière classiques** sont rapides, mais limitées à des bornes d'accélération en boîte, trop
  prudentes pour une voiture de course. L'article FBGA (Piazza et al., 2025) les étend à des contraintes génériques. Il
  annonce la précision de la commande optimale, jusqu'à mille fois plus vite.
- **Les méthodes quasi statiques (QSS)** coupent le tour aux sommets de courbure et supposent l'accélération
  latérale maximale aux sommets. Ce n'est pas toujours la manœuvre optimale (même source).

**Pour nous** : le point matériel avec un cercle d'adhérence pour J1. La boîte, le g-g et l'aéro viendront plus
tard, si une question l'exige. **Hypothèse** : quelques microsecondes par tour pour N = 100 à 500 points, à
mesurer au banc.

## 3. La ligne la plus courte

On minimise la longueur, ce qui donne un problème quadratique en α. Elle colle aux cordes et serre trop les virages,
donc elle est lente. Le dépôt d'optimisation de TU Munich la propose parmi ses objectifs (« shortest path »). C'est
une **référence**, pas un candidat.

## 4. La courbure minimale

On minimise la somme des courbures au carré. C'est un programme quadratique en α si on linéarise autour de la ligne
courante, et on itère.

- **L'idée** : une ligne de faible courbure permet de passer vite partout. En virage, elle est proche de la ligne de
  temps minimal. Elle s'en écarte dès que la voiture n'exploite plus ses limites d'accélération (README de TU Munich).
- **Braghin, Cheli, Melzi et Sabbioni (2008)**, « Race driver model » : le meilleur pilote est celui qui fait le
  temps le plus court avec une voiture donnée. La première étape est de choisir la trajectoire. Un compromis entre
  la plus courte et la courbure minimale y apparaît. Le texte intégral n'a pas été lu (accès restreint), donc le
  détail du compromis reste **à vérifier**.
- **Heilmeier et al. (2020)**, « Minimum curvature trajectory planning and control for an autonomous race car »
  (Vehicle System Dynamics) : la méthode de l'équipe de TU Munich, open source (`global_racetrajectory_optimization`).
  Les lignes de course de leur base de pistes ont été calculées par elle.
- **Sa popularité** : la revue F1TENTH (Evans et al., 2024) la dit la plus répandue. Elle est rapide à calculer,
  robuste d'une piste à l'autre, ouverte, et d'une bonne qualité.

**Pour nous** : la **règle à battre** sérieuse. Pour l'écrire, il faut un petit solveur QP avec des bornes (ou une
descente projetée, plus simple). C'est la porte d'entrée de la famille « gradients et contraintes » que `reseau`
attend aussi.

## 5. Les deux étapes de Stanford (Kapania, Subosits, Gerdes, 2015)

« A Sequential Two-Step Algorithm for Fast Generation of Vehicle Racing Trajectories » (ASME DSCC 2015 ; arXiv
1902.00606).

- **La méthode** : (1) le profil de vitesse de la ligne fixée, par intégration avant-arrière ; (2) la ligne mise à
  jour par un problème convexe qui réduit la courbure sous les bornes de la piste. On répète tant que le temps baisse.
- **Les résultats** : sur Thunderhill Raceway, le temps se stabilise en trois itérations, d'environ trente secondes
  chacune sur un portable. Le résumé arXiv dit quatre à cinq itérations sur un tracé de 4,5 km : les deux versions
  divergent. Ni la convergence ni l'optimum global ne sont garantis.
- **La validation** : une Audi TTS autonome a roulé la trajectoire. Son temps et sa ligne sont comparables à une
  descente de gradient non linéaire et à la trajectoire d'un pilote professionnel. Point faible : un droit en descente
  serré, la pente n'étant pas modélisée.

**Pour nous** : la méthode « sérieuse » la plus simple. Elle a la même structure que notre J2 (profil de vitesse +
ligne), avec un pas convexe à la place de CMA-ES. La comparer à CMA-ES est une bonne question (piste P4).

## 6. Le temps minimal en commande optimale (F1)

C'est la méthode de l'industrie.

- **Perantoni et Limebeer (2014)**, « Optimal control for a Formula One car with variable parameters » (Vehicle
  System Dynamics 52(5), p. 653-678) : le problème du temps minimal au tour, résolu par transcription directe et
  programmation non linéaire. Ils optimisent à la fois la ligne, les commandes du pilote et plusieurs réglages de la
  voiture. Exemple : le circuit de Catalunya (Barcelone). Un réglage propre à la piste fait gagner un temps
  significatif. Ils rappellent que les calculs de commande optimale sur un tour complet prenaient de 28 à 60 heures
  sur une station de travail des années 1990, avec un modèle simple à quatre roues.
- **TU Munich** propose aussi le temps minimal (`opt_mintime_traj`), avec ou sans modèle du groupe motopropulseur.
  Il demande beaucoup plus de paramètres et de calcul que la courbure minimale (leur README). Le solveur exact
  (CasADi et IPOPT, d'après nos souvenirs) est **à vérifier** dans leur code.

**Pour nous** : hors de portée en J1-J4. Il faudrait un solveur non linéaire à gradients, et tout le reste de la lib
est sans dérivées. Le résultat à retenir : **la ligne et le réglage s'optimisent ensemble** (piste P11, où CMA-ES le
fait sans gradients).

## 7. Les méthodes sans dérivées : génétique et bayésienne

- **Cardamone, Loiacono, Lanzi et Bardelli (2010)**, « Searching for the optimal racing line using genetic
  algorithms » (IEEE CIG 2010, p. 388-394) : la piste est coupée en segments, et un algorithme génétique arbitre entre
  la longueur et la courbure. Aucune ligne dessinée à la main. Simulateur : TORCS. Le texte intégral n'a pas été lu,
  donc la note exacte est **à vérifier**.
- **Vrajitoru** (GECCO 2019, et un article IConEST) : des algorithmes génétiques sur TORCS, pour minimiser les
  virages ou la longueur.
- **Jain et Morari (2020)**, « Computing the racing line using Bayesian optimization » (IEEE CDC 2020 ; arXiv
  2002.04794 ; code `bayesrace`) : la ligne est une spline cubique passant par D points de passage, et l'optimisation
  bayésienne cherche ces points. Ils annoncent une méthode entièrement pilotée par les données, plus économe en calcul
  que la programmation dynamique ou la recherche aléatoire. Elle vise une équipe qui doit trouver vite la ligne d'une
  piste nouvelle.
- **CMA-ES** : nous n'avons pas trouvé d'article de référence sur la ligne de course par CMA-ES en tant que tel.
  L'idée qu'il y excelle est **notre hypothèse** : les écarts voisins sont corrélés (une vallée en biais), et le test
  de la lib (13/11) montre CMA-ES à 1e-25 là où l'escalade reste à 675 sur une telle vallée.

**Pour nous** : c'est notre terrain. CMA-ES, l'escalade et la course aux configurations sont dans la lib.
L'optimisation bayésienne n'y est pas : elle ne paie que si la note coûte cher (un tour en simulation complète, des
secondes), ce qui n'est pas le cas du profil de vitesse (piste P5).

## 8. Ce qu'on retient

| Méthode | Note | Coût connu | Dans la lib | Rôle chez nous |
|---|---|---|---|---|
| Ligne centrale | – | nul | – | référence basse |
| Plus courte | longueur | un QP | non | référence |
| Courbure minimale (Heilmeier 2020) | courbure² | un QP itéré | non (QP à écrire) | **la règle à battre** |
| Deux étapes (Kapania 2015) | temps, par pas convexes | ~3 × 30 s sur un portable | non | piste P4 |
| Temps minimal, commande optimale (Perantoni 2014) | temps, modèle complet | lourd (NLP) | non | hors de portée, à lire |
| Génétique (Cardamone 2010) | longueur + courbure | – | presque (`climb`) | référence historique |
| Bayésienne (Jain 2020) | temps | peu d'essais | non | piste P5 |
| **CMA-ES** | **temps** | **~20 µs par plan à 40 gènes, hors note** | **oui** | **le cœur de J2** |

## Sources

- TUMFTM, `global_racetrajectory_optimization` (README : plus courte, courbure minimale, temps minimal) :
  <https://github.com/TUMFTM/global_racetrajectory_optimization>
- Heilmeier et al., « Minimum curvature trajectory planning and control for an autonomous race car », Vehicle System
  Dynamics, 2020 (cité par le README ci-dessus).
- Braghin, Cheli, Melzi, Sabbioni, « Race driver model », Computers & Structures 86, 2008, p. 1503-1516 :
  <https://re.public.polimi.it/handle/11311/544551>
- Kapania, Subosits, Gerdes, « A Sequential Two-Step Algorithm for Fast Generation of Vehicle Racing Trajectories » :
  <https://arxiv.org/abs/1902.00606>
- Perantoni, Limebeer, « Optimal control for a Formula One car with variable parameters », Vehicle System Dynamics
  52(5), 2014 : <https://ora.ox.ac.uk/objects/uuid:db0437cc-0b4f-495d-96d5-524ea4bfda5e>
- Piazza et al., FBGA, profils de vitesse sous contraintes génériques, 2025 : <https://arxiv.org/abs/2509.26428>
- Werner et al., diagrammes g-g-g-v, 2025 : <https://arxiv.org/abs/2504.10225>
- Cardamone, Loiacono, Lanzi, Bardelli, IEEE CIG 2010 (notice) : <https://search.isc.ac/inventory/49/2446813.htm>
- Vrajitoru, GECCO 2019 : <https://www.cs.iusb.edu/~dvrajito/papers/DV_Gecco19.pdf>
- Jain, Morari, « Computing the racing line using Bayesian optimization » : <https://arxiv.org/abs/2002.04794>
- Evans et al., « Unifying F1TENTH Autonomous Racing: Survey, Methods and Benchmarks », 2024 :
  <https://arxiv.org/abs/2402.18558>
- Le test de CMA-ES contre l'escalade : `mcts-commun/tests/lib/cmaes.test.js`, « slanted valley ».
