# Le modèle du J1 : la piste, la voiture, le profil de vitesse, les trois lignes

Écrit le 14/11/2026, au premier jalon (P1 de [recherche/pistes.md](recherche/pistes.md)). Chaque chiffre a sa source ou
il est marqué **hypothèse**. Les mesures citées se refont par `npm run references` et `npm run bench`.

## 1. La piste

- **Le format** est celui de la base de TU Munich (`racetrack-database`) : une ligne centrale fermée `x_m, y_m` et la
  largeur libre à droite et à gauche (`w_tr_right_m, w_tr_left_m`), un point tous les 5 m environ (4,3 à 5,4 m,
  mesuré sur les 25 pistes). Le dernier point rejoint le premier. Code : `src/track/track.js`.
- **La normale** en chaque point est la normale gauche de la différence centrée. Une ligne est un écart le long de
  cette normale, positif à gauche.
- **Le téléchargement** : `npm run tracks` copie les 25 pistes, leurs lignes de course, la licence (LGPL-3.0) et le
  README dans `data/tum/`, que git ignore (décidé avec Sami le 13/11). Le commit est épinglé (`e59595d`, master le
  13/11), pour que chaque machine mesure les mêmes pistes.
- **Les pistes de test**, tracées à la main (`src/track/shapes.js`) : l'anneau, le stade (deux droites, deux
  demi-cercles) et le polygone aux coins arrondis. Tous sont parcourus dans le sens inverse des aiguilles d'une
  montre, la normale gauche vers l'intérieur des virages.

## 2. La voiture : la F1 de TU Munich en point matériel

La source est `laptime-simulation/laptimesim/input/vehicles/F1_Shanghai.ini` (LGPL-3.0, lu le 13/11). Code :
`src/car.js`, qui recopie les chiffres du fichier un par un, avec leurs unités.

| Grandeur | Valeur | D'où |
|---|---|---|
| masse | 733 kg | le fichier (pilote compris, sans carburant) |
| μ longitudinal, μ latéral | 1,814 et 2,014 | le fichier (avant 1,65 / 1,85, arrière 1,95 / 2,15), pondérés par la charge statique de chaque essieu (45,3 % à l'avant, de `lf` et `lr`) : **hypothèse** |
| motricité | 1,066 = 1,95 × 54,7 % | propulsion (`topology: RWD`) : seul l'essieu arrière tire. **Hypothèse** du point matériel |
| sensibilité à la charge | −5·10⁻⁵ par N au-delà de 3 000 N par pneu | le fichier (`dmux_dfz`, `dmuy_dfz`, `fz_0`), les quatre pneus également chargés : **hypothèse** |
| appui ½·ρ·cz·A | 2,88 N/(m/s)² | le fichier (cz·A 2,20 + 2,68 m², ρ 1,18) |
| traînée ½·ρ·cw·A | 0,920 N/(m/s)² | le fichier (cw·A 1,56 m²) |
| résistance au roulement | 0,03 × la charge normale | le fichier (`f_roll`) |
| puissance aux roues | 552 kW, plus 120 kW au-delà de 27,8 m/s | le fichier (575 kW × 0,96 de boîte ; moteur électrique de 120 kW après pertes, `vel_min_e_motor`) |
| vitesse de pointe | 86,6 m/s (312 km/h) | dérivée : la puissance égale la traînée et le roulement |

**Ce qui est laissé de côté** (hypothèse : sans effet sur la question du J1, qui compare des lignes sous un même
modèle) : les rapports et la courbe de puissance selon le régime, la masse en rotation (`e_i`, 1,07 à 1,16), le
budget d'énergie électrique, le DRS, le transfert de charge entre les essieux. La vitesse de pointe est donc basse
pour Monza, où les F1 dépassent 340 km/h avec un aileron réduit et le DRS.

**L'adhérence** est une ellipse : (Fx / μx·N)² + (Fy / μy·N)² ≤ 1, avec N = m·g + ½·ρ·cz·A·v² et chaque μ décalé de
dμ/dFz·(N/4 − Fz0). Le fichier de TU Munich règle l'exposant de sa forme à 2 (`tire_model_exp`) : c'est bien une
ellipse.

## 3. Le profil de vitesse, la note d'une ligne

Code : `src/profile/grip.js` (ce que l'ellipse laisse) et `src/profile/profile.js` (les passes).

1. **La courbure** en chaque point est celle de Menger : le cercle qui passe par le point et ses deux voisins.
   Elle est exacte sur un cercle (`src/geometry.js`).
2. **La vitesse de virage** : la force latérale m·v²·|κ| prend toute l'adhérence latérale. Avec u = v², la charge et
   le μ sont affines en u, donc u est la racine positive d'un trinôme, prise sous sa forme stable. Sans appui, c'est
   √(μ·g/|κ|). Avec l'appui et sans sensibilité à la charge, un virage de rayon supérieur à 1/(μ·k) n'a plus de
   limite (127 m pour cette F1). Avec la sensibilité, la limite reste finie, mais au-dessus de la vitesse de pointe.
3. **La passe avant** part du point le plus lent, à sa vitesse de virage. Elle accélère pas à pas : v² croît de
   2·a·ds, où a est la motricité que le virage laisse, plafonnée par la puissance, moins la traînée et le roulement.
4. **La passe arrière** repart du même point à rebours et freine de la même façon, aidée par la traînée.
5. **Le temps** : chaque pas à la moyenne de ses deux vitesses, 2·ds / (v₁ + v₂). C'est exact sous une
   accélération constante.

**Pourquoi le profil respecte l'adhérence** : la passe arrière prend le minimum avec la passe avant. Un pas qui
accélère garde donc sa vitesse de départ de la passe avant. Un pas qui freine a sa vitesse de départ fixée par la
passe arrière, ou bien plus basse. Le tour fermé commence au point le plus lent, et toutes les vitesses restent au
moins à ce niveau : la boucle se referme sans conflit. Le test le vérifie pas à pas, sur un stade aux épingles.

**Les tests** (`tests/profile.test.js`), ceux que P1 demandait :

- sur un anneau, la vitesse est constante et vaut √(μ·g·R) ;
- en ligne droite, le temps suit la cinématique exacte, depuis l'arrêt ou lancé ;
- le profil ne dépasse jamais l'ellipse ;
- « le pied au plancher » : un virage de 400 m de rayon ne fait jamais freiner (Sami, 13/11) ;
- une épingle de 15 m fait freiner à plus de 3 g ;
- la même ligne donne le même temps, au bit près.

Pour une ligne ouverte (le pilote du J4), `pathTime` prend une vitesse d'entrée et laisse la sortie libre.

## 4. Les trois lignes de référence

Code : `src/line/`. Une ligne, c'est un écart par point de la piste.

- **Les bornes** : les bords moins une demi-largeur de voiture, **1 m par défaut**. Une F1 mesure 2 000 mm au plus de
  2017 à 2025 ([Motor Sport, avril 2017](https://www.motorsportmagazine.com/archive/article/april-2017/82/new-year-new-rules/) ;
  [f1technical](https://f1technical.net/articles/12497)), et la F1 de TU Munich date de 2019. Aucune marge de
  sécurité n'est ajoutée : c'est une **hypothèse**, et une question pour Sami.
- **Le centre** : tous les écarts à zéro.
- **La plus courte** : la longueur de la ligne fermée.
- **La courbure minimale** : l'énergie de flexion ∫κ²·ds, soit la courbure de Menger au carré en chaque point,
  multipliée par le demi-pas de chaque côté.
- **La descente** (`src/line/descent.js`) : un gradient projeté sur les bornes, accéléré (FISTA), avec un pas trouvé
  par retour en arrière et une relance de l'élan quand la valeur remonte. Les deux gradients sont exacts : le test les
  compare aux différences finies. Il n'y a pas de QP ; il viendra dans la lib avec P4 (décidé le 13/11).

**Pourquoi par mètre et pas par point** (mesuré le 14/11, à la marge de TU Munich, 0,75 m). Somme par point,
Σκ² : une ligne large étale un virage sur des pas plus longs, et elle est trop bien notée. Sur Shanghai, cette ligne
était plus longue que le centre (5 509 m contre 5 445 m). Les trois variantes ont été comparées par le temps au
tour :

| Piste | Σκ² (par point) | **Σκ²·ds (∫κ²·ds)** | Σκ²·ds² | la ligne de TUM |
|---|---|---|---|---|
| Shanghai | 91,42 s | **89,10 s** | 90,65 s | 89,19 s |
| Monza | 80,52 s | **80,55 s** | 81,65 s | 81,14 s |
| Budapest | 75,04 s | **74,47 s** | 75,32 s | 74,82 s |
| Spa | 102,05 s | **101,63 s** | 102,68 s | 102,42 s |

∫κ²·ds est la plus rapide, ou à 0,03 s de la plus rapide. Elle ne dépend pas du pas de la discrétisation : on la
garde.

**Ce que les tests vérifient** (`tests/lines.test.js`) :

- sur un anneau, la plus courte colle à l'intérieur et la courbure minimale à l'extérieur ;
- sur un carré aux coins arrondis, la courbure minimale prend l'extérieur, la corde, puis l'extérieur, et elle bat le
  centre et la plus courte ;
- sur le demi-tour d'un stade, elle reste à l'extérieur : entre les bords extérieurs de deux droites parallèles
  (72 m), aucun arc plus large ne tient.

**La convergence** : sur Monza (1 159 points), la descente se stabilise en environ 10 000 itérations, soit 2 s. Le
temps au tour est déjà à 0,03 s près après 2 000 itérations. Une évaluation de ∫κ²·ds et de son gradient coûte
60 µs.

## 5. La vérification contre TU Munich

**La marge de leurs lignes** : leur optimiseur a 1,7 m de demi-largeur par défaut (`width_opt` 3,4 m,
`params/racecar.ini` de `global_racetrajectory_optimization`). Leurs 25 lignes de course gardent pourtant **0,75 m**
du bord : c'est le 5ᵉ centile de la distance au bord sur chaque piste, à 0,01 m près, mesuré le 14/11. La
comparaison se fait donc à 0,75 m (`TUM_HALF_WIDTH`).

**Le test** (`tests/tum.test.js`, sauté tant que `npm run tracks` n'a pas tourné) : sur Monza, notre courbure
minimale passe en moyenne à 0,92 m de la leur, et elle n'est pas plus lente (80,55 s contre 81,14 s sous notre
profil).

**Les 25 pistes** : voir § 6.

## 6. Les temps au tour des références

La mesure `npm run references` des 25 pistes attend sa place dans la file (job `circuit-references-j1`, 14/11). Le
tableau viendra ici.

## 7. Le banc de la note

`npm run bench`, le 14/11, sur une machine pleine (18 fils sur 18 pris par la file) : les chiffres sont donc des
majorants. Chaque tour place une ligne d'écarts tirés par graine, puis la note.

| Pas | Points (moyenne des 25 pistes) | µs par tour | ns par point |
|---|---|---|---|
| 5 m | 972 | 83 | 86 |
| 10 m | 486 | 40 | 83 |
| 20 m | 243 | 17 | 70 |

- **L'hypothèse du cadrage** (« quelques microsecondes par tour, pour N = 100 à 500 ») était trop optimiste d'un
  facteur 5 environ. Pour P2, à 20 m de pas, 10 000 lignes notées coûtent 0,2 s. Le budget de CMA-ES est donc
  ailleurs : environ 25 µs par plan à 50 gènes (mesure de la lib, 13/11).
- **`Math.hypot`** coûtait la moitié du temps : 162 µs par tour avant, 83 µs après le passage à `Math.sqrt`.
- **Le chemin chaud n'alloue rien** : 0,2 octet par tour à 20 m. Il restait environ 1,3 ko par tour avec
  `Math.hypot`.

## 8. Ce qui reste ouvert

- **Les hypothèses du § 2** : le point matériel, la boîte idéale et l'absence de DRS. Elles ne changent pas l'ordre
  des lignes sous un même modèle. Elles comptent le jour où l'on compare nos temps aux vrais.
- **La demi-largeur** : 1 m (la F1, sans marge), 0,75 m (les lignes de TU Munich) ou 1,7 m (leur optimiseur). C'est
  une question pour Sami.
- **Le grossier au fin** (P3) accélérerait la courbure minimale, qui prend 2 s par piste à 5 m. Ce n'est pas
  nécessaire au J1.
- **Les pistes tirées par graine** ([recherche/bancs.md](recherche/bancs.md) § 4) attendent le J2, avec la course aux
  configurations.
