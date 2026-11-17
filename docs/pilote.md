# Le J4 : la voiture qui glisse, et le pilote qui la tient sur la ligne

Le profil de vitesse du J1 est celui d'un point matériel : il ne glisse pas, il ne tourne pas, il se pose sur la ligne.
Le J4 met sur la piste une voiture qui a un lacet, des pneus qui décrochent et des commandes à doser, et un pilote qui
la tient sur la ligne du J2 tick par tick. C'est la règle à battre côté pilote (P7), avant les pilotes par recherche et
avant Sami aux commandes (P9). Commencé le 15/11/2026.

## 1. Ce qui est décidé

Sami, 15/11 : « tu peux continuer », sur les quatre recommandations du cadrage :

1. **L'ordre** : la voiture qui glisse et la poursuite pure d'abord, mesurées sur les 25 pistes, puis Sami aux
   commandes, dans le même J4.
2. **Le modèle** : la bicyclette avec un pneu qui sature, à 100 Hz ; le transfert de charge longitudinal y est,
   le transfert latéral et les quatre roues plus tard, s'ils servent.
3. **Les vues** : piloter d'abord sur la vue de dessus, caméra sur la voiture ; la vue de face (avec le panneau des
   100 m) quand le pilotage tient.
4. **P6** (l'escalade sur les commandes) après le J4.

## 2. La voiture : la bicyclette dynamique

Les deux roues avant n'en font qu'une, les deux arrière aussi (`src/drive/bicycle.js`). L'état : la position, le cap,
la vitesse avant u et la vitesse latérale v dans le repère de la voiture, le lacet r, l'angle de braquage et la pédale
réels. Les commandes : un braquage et une pédale de −1 (frein à fond) à 1 (plein gaz).

- **Les charges** de chaque essieu : sa part statique (45 % à l'avant), son appui aérodynamique (les cz·A avant et
  arrière de TUM, 45 % à l'avant), et le transfert du dernier pas, m·a_x·h / L.
- **Le pneu latéral** (`src/drive/tyre.js`) : μ / μmax = sin(Q·atan(S·α / α̂)), la forme du pneu de F1 de Perantoni
  et Limebeer. L'effort monte avec la dérive α, culmine à la dérive de pic α̂, puis retombe : passé le pic, plus de
  dérive donne moins d'adhérence, et la voiture part en tête-à-queue. S place le pic à α̂ (Q·atan(S) = π/2). Le texte
  extrait de l'article ne laisse pas lire sa normalisation : la nôtre suit la définition de α̂ dans le tableau.
- **L'ellipse** : chaque essieu donne d'abord son effort longitudinal, puis l'effort latéral que l'ellipse laisse,
  √(1 − (Fx / μx·Fz)²) de son μy·Fz. C'est l'ellipse du point matériel, essieu par essieu. Perantoni et Limebeer
  combinent les deux glissements en un seul ; c'est une simplification, et une hypothèse.
- **Les gaz** poussent l'arrière, dans la limite de la puissance et de son adhérence. **Le frein** prend la même part
  de l'adhérence des deux essieux : une répartition idéale et des roues qui ne bloquent pas, une hypothèse (un ABS que
  la F1 n'a pas).
- **Les commandes** suivent celles du pilote avec un retard du premier ordre, le braquage dans sa butée.
- **L'intégration** : Euler semi-implicite, en sous-pas de 2,5 ms (400 Hz) sous le tick de 10 ms. Sans eux, la
  dérive des pneus raides oscille à basse vitesse.

| Grandeur | Valeur | Source |
|---|--:|---|
| masse, empattement (lf, lr), cw·A, cz·A avant et arrière, μ par essieu, dμ/dFz, Fz0, puissance | | la F1 de TUM, `F1_Shanghai.ini` (`src/car.js`) |
| inertie de lacet Iz | 450 kg·m² | Perantoni et Limebeer 2014, tableau 2 (voiture de 660 kg, 3,4 m) |
| hauteur du centre de gravité | 0,3 m | le même tableau |
| dérive de pic à 2 000 N / 6 000 N par pneu | 9° / 8° | le même article, tableau 3 |
| facteur de forme Q | 1,9 | le même tableau |
| butée de braquage | 0,35 rad | `racecar.ini` de TUM (une autre voiture) : hypothèse pour la F1 |
| retard de la pédale | 0,05 s | `racecar.ini` de TUM, t_drive et t_brake |
| retard du braquage | 0,05 s | **hypothèse** : les 0,2 s de TUM (l'actionneur d'une voiture autonome) font zigzaguer tout pilote à 300 km/h (§ 3) |

L'inertie de Perantoni et Limebeer n'est pas mise à l'échelle de la F1 de TUM (733 kg, 3,6 m) : une hypothèse de plus.

**Ce que la bicyclette révèle du point matériel.** L'essieu avant porte 45 % du poids et de l'appui, et prend la même
part de l'effort latéral dans un virage établi : il sature le premier, à son propre μy (1,85, contre 2,15 à l'arrière).
Le point matériel du J1 prenait la moyenne pondérée, 2,01 : il passe les virages environ 4 % trop vite pour cette
voiture. Le profil que la bicyclette peut suivre est donc celui d'un point matériel au μy de l'avant (`profileCar`) :
à Monza, 81,12 s pour la meilleure ligne au lieu de 78,88 s, 82,82 s pour la courbure minimale au lieu de 81,05 s.
À l'inverse, à la sortie des virages lents, l'arrière porte 55 % de l'appui et le transfert de charge : la bicyclette
y accélère plus fort que le point matériel (17,1 m/s² contre 14,7 à 40 m/s, plein gaz en ligne droite).

## 3. Le pilote règle : la poursuite pure

Le pilote (`src/drive/pursuit.js`) :

- **vise** le point de la ligne situé à une distance d'anticipation devant lui (0,25 s de la vitesse, 8 m au moins),
  et braque sur l'arc qui l'y mène ;
- **ajoute le terme de Stanley**, atan(k·e / u) vers la ligne, e l'écart à la ligne mesuré en travers (Hoffmann et
  al. 2007, la loi de Stanley, la voiture de Stanford au DARPA Grand Challenge 2005) ;
- **suit le profil** un peu devant lui (0,3 s) : la pédale donne l'accélération du profil, calculée sur les chiffres
  du point matériel, plus 0,1 par m/s de vitesse manquante ;
- **plafonne la pédale**, dans les deux sens, à ce que le virage laisse d'adhérence, √(1 − (a_y / a_y,max)²), avec
  a_y = u·r, l'accélération latérale qu'un pilote sent dans son siège.

Les trois leçons de sa mise au point, sur Monza :

1. **Plein gaz en sortie de chicane, l'arrière décroche.** À 20 m/s, la motricité prend toute l'adhérence arrière, et
   il ne reste rien pour tourner. Le pilote dose donc ses gaz selon l'accélération du profil et le virage en cours,
   comme on le fait sans antipatinage.
2. **Le retard de braquage de TUM (0,2 s) fait zigzaguer la voiture à 77 m/s** en ligne droite, jusqu'à la sortie de
   piste en 7 s, et le terme de Stanley l'aggrave. À 0,05 s, tout se tient.
3. **La poursuite pure seule laisse la voiture dériver vers l'extérieur** des virages rapides, de 2 à 5 m : la
   voiture sous-vire, et la poursuite pure ne corrige pas un écart durable. Le terme de Stanley le ramène.

Les six réglages ont été posés à la main sur Monza, puis réglés par CMA-ES (P7, § 6).

| Réglage | À la main (`PURSUIT`) | Réglé par P7 (`TUNED`) |
|---|--:|--:|
| anticipation de la visée | 0,25 s, 8 m au moins | 0,22 s, 3 m au moins |
| part de la vitesse du profil | 1 | 0,96 |
| gain de vitesse | 0,1 par m/s | 0,09 par m/s |
| anticipation de la vitesse | 0,3 s | 0,31 s |
| gain de Stanley k | 1 /s | 0 |

## 4. Le tour piloté

`driveLap` (`src/drive/run.js`) pose la voiture sur le premier point de la ligne, à la vitesse du profil. À chaque tick
de 10 ms, il demande les commandes au pilote, fait avancer la voiture, et compte :

- le temps ;
- le temps hors piste, avec le centre de la voiture au-delà d'un bord, donc deux roues dehors ;
- l'écart à la ligne, mesuré en travers.

Le tour s'arrête, non fini, si la voiture part en tête-à-queue (|v| > u) ou si elle est à plus de 10 m du bord. Un tour
prend environ 15 ms : les 25 pistes, deux lignes chacune, se mesurent en 1,6 s, à côté de la file.

## 5. La mesure : la règle sur les 25 pistes

`npm run drive` pilote la meilleure ligne et la ligne de courbure minimale de `npm run lines`, contre le profil de la
bicyclette (15/11).

| Ligne | Tours finis | Plus lent que le profil (moyenne des tours finis) | Hors piste |
|---|--:|--:|---|
| courbure minimale | 24 / 25 | 5,5 % | rare, 0,4 s au plus |
| la meilleure | 13 / 25 | 6,7 % | sur presque toutes les pistes, jusqu'à 2 s |

- **La règle laisse 5 à 7 % sur le profil.** À Monza, sur la courbure minimale, 86,6 s contre 82,8 s : 1,7 s perdues
  aux freinages, 0,9 s dans les virages, 1,0 s aux réaccélérations, 0,2 s en ligne droite.
- **La meilleure ligne reste la plus rapide quand le pilote la tient** : 80,9 s contre 82,4 s à Budapest, 76,6 s contre
  77,3 s à Hockenheim. Mais elle frôle les bords (à 1 m du bord, la demi-largeur de la voiture) et change de courbure
  sans cesse. Le moindre écart sort la voiture, et 12 tours sur 25 s'arrêtent. Elle a été cherchée pour le point
  matériel et son μy de 2,01, pas pour cette voiture.
- **Suzuka arrête les deux lignes** au premier virage (12,6 s), et la courbure minimale seule de Montréal à Zandvoort
  passe partout ailleurs.

## 6. P7 : le pilote réglé par CMA-ES

`scripts/p7.js` (15/11, par la file, 3 min par graine) règle les six réglages par CMA-ES, chaque gène ramené dans
[0, 1] sur une plage. L'entraînement se fait sur les 12 pistes de rang pair, la vérification sur les 13 autres, avec les
deux lignes à chaque fois. Un tour vaut (temps + secondes hors piste) / profil − 1, et un tour arrêté vaut 0,5.
CMA-ES tourne 40 générations, avec 3 graines.

| | Score d'entraînement | Score de vérification |
|---|--:|--:|
| à la main | 0,232 | 0,117 |
| graine 1 | 0,086 | 0,097 |
| graine 2 | 0,088 | 0,100 |
| graine 3 | 0,092 | 0,106 |

Les trois graines battent la règle à la main sur les pistes qu'elles n'ont pas vues. Elles trouvent la même chose :
**finir vaut mieux qu'aller vite**. La marge tombe à 0,96 et le terme de Stanley disparaît, car il ne servait qu'à
tenir une voiture poussée à la limite. Sur les 25 pistes (`npm run drive`) :

| Ligne | À la main : tours finis, écart au profil | Réglé : tours finis, écart au profil |
|---|--:|--:|
| courbure minimale | 24 / 25, 5,5 % | **25 / 25**, 7,6 % |
| la meilleure | 13 / 25, 6,7 % | **24 / 25**, 8,2 % |

Le réglé ne s'arrête plus qu'à Oschersleben, au premier virage de la meilleure ligne. Il garde 0,2 à 1,6 s hors piste
sur la meilleure ligne, et presque rien sur la courbure minimale. C'est le pilote de la page.

### 6 bis. La nuit du 16/11 : l'escalade contre CMA-ES, et les lignes de la bicyclette

Deux questions, 13 jobs de la file (commit 40c5f0c, résultats dans `tmp/p7/`) :
- **l'escalade suffit-elle ici aussi ?** C'est le cas chez economie (R3, 7 gènes bornés) ;
- **la ligne cherchée pour la bicyclette est-elle plus rapide** que celle du point matériel ?

Le protocole :
- `lookMin` va désormais de 1 à 20 m : la graine 1 du 15/11 était à la borne de 3 m.
- Les deux recherches partent de la règle à la main, avec le même budget de 360 plans.
- L'escalade de la lib bouge un gène par plan, par un tirage normal de 0,2 × l'amplitude, ramené dans [0, 1].

Les scores sont des moyennes sur 3 graines (entre parenthèses, la pire et la meilleure graine). La règle à la main
vérifie à 0,117 sur les lignes du point matériel et à 0,119 sur celles de la bicyclette.

| Lignes | Recherche | Entraînement | Vérification |
|---|---|--:|--:|
| point matériel | CMA-ES | 0,087 (0,085-0,091) | 0,100 (0,097-0,105) |
| point matériel | escalade | 0,094 (0,085-0,105) | 0,105 (0,096-0,117) |
| bicyclette | CMA-ES | 0,091 (0,090-0,094) | 0,098 (0,089-0,104) |
| bicyclette | escalade | 0,105 (0,092-0,112) | 0,100 (0,088-0,125) |

- **Ici, CMA-ES fait au moins aussi bien que l'escalade**, contrairement aux trois cas du tableau : la ligne, Mars
  Lander, R3. Il est meilleur à l'entraînement dans les deux cas et plus régulier d'une graine à l'autre. Une graine de
  l'escalade (bicyclette, graine 2) vérifie moins bien que la règle à la main. Les écarts de vérification restent dans
  le bruit de 3 graines. Notre lecture : les six réglages sont liés (la marge, le gain et l'anticipation se compensent)
  et l'optimum est surtout intérieur. Seul `crossGain` reste à sa borne 0, dans 9 réglages sur 12.
- **L'écart entre l'entraînement et la vérification** (0,01 à 0,03) dit que 12 pistes ne suffisent pas à fixer six
  réglages au millième. `TUNED` reste celui du 15/11.
- **Les lignes de la bicyclette** (`npm run lines -- --bicycle`, dans `data/lines-bicycle/`) sont meilleures sur les
  25 pistes. Au profil de la bicyclette, la meilleure ligne gagne 0,05 à 1,18 s, 0,43 s en moyenne (Spa 1,18 s,
  Silverstone 1,06 s, Monza 0,25 s). Pilotée par `TUNED`, elle gagne 0,37 s en moyenne sur les 23 pistes où les deux
  tours finissent. Le pilote réglé y finit 23 tours sur 25 au lieu de 24 : Oschersleben s'arrête toujours, et Sakhir
  part en tête-à-queue à 48 s.

## 7. Sami aux commandes : la page Piloter

`web/drive.html` (P9, 15/11) : la voiture de Sami et celle du pilote réglé partent ensemble de la ligne de départ, à la
vitesse du profil. Le fantôme du profil de la ligne refait chaque tour avec lui. Les entrées passent par une fonction
pure (`src/drive/input.js`), et la course par `src/drive/session.js`, tous deux testés.

- **Le clavier** : flèche haut pour accélérer, Ctrl gauche (ou flèche bas) pour freiner, les flèches pour tourner. Une
  touche est tout ou rien : le braquage met 0,25 s pour aller à la butée (une hypothèse).
- **La manette** : A pour accélérer, RB pour freiner, la gâchette RT pour freiner en dosant, le stick gauche pour
  tourner en proportion.
- **À haute vitesse, la butée se réduit** à ce qui donne 50 m/s² (L·a / u², environ 5 g), comme dans un jeu de course.
  Sans cela, une touche à fond à 300 km/h ferait partir la voiture en tête-à-queue d'un coup.
- **Les aides** (17/11, T pour les couper), après le retour de Sami (« très difficile à conduire, spin en sortie de
  virage », au clavier comme à la manette). Une touche est tout ou rien, et plein gaz donnait à l'arrière toute son
  adhérence longitudinale : l'ellipse de frottement ne laissait plus rien au virage. L'antipatinage et l'ABS
  (`assisted`, `src/drive/bicycle.js`) bornent la force de chaque essieu à ce que l'ellipse laisse, une fois gardée la
  force latérale que demande son angle de dérive. La mesure (`tmp/j4/assist.mjs`) prend la direction du pilote réglé et
  son accélérateur rendu tout ou rien. Sans les aides, il finit 1 tour sur 25 ; avec elles, 21 tours, à 8,0 % du profil.
  Le pilote réglé y perdrait 1,2 point (de 7,6 à 8,8 %) : il n'en a pas, et ses chiffres ne changent pas.
- **Les vues** (17/11, V pour changer) : derrière la voiture (`src/view/chase.js`, une caméra à 9 m derrière et 3,2 m
  de haut, la route jusqu'à 450 m, le cap suivi avec un retard pour qu'une glissade se voie), de dessus proche
  (1,2 s de route plus 40 m), ou de dessus loin comme avant.
- **Les panneaux de freinage** (`src/view/boards.js`) : à 150, 100 et 50 m de chaque point où le profil commence un
  freinage de 8 m/s ou plus, du côté où la ligne n'est pas. Trois, deux puis une bande, comme sur les vrais circuits
  (questions.md § 4, question 1).
- **La manette au choix** : la disposition de Sami, ou celle des jeux de course (RT gaz dosé, LT frein dosé), pour
  doser l'accélérateur que le bouton A donne tout ou rien.
- **La vue de dessus** (la première) : la caméra suit la voiture, son cap vers le haut. Le champ grandit avec la vitesse (2,5 s de route plus
  60 m) pour voir le point de freinage, et une carte du circuit tient dans un coin.
- **Le panneau** :
  - la vitesse ;
  - le temps du tour et l'écart au fantôme au même point ;
  - le dernier tour et son temps hors piste ;
  - le meilleur tour propre, gardé dans le navigateur ;
  - le dernier tour du pilote.

## 8. La suite

- **Le retour de Sami** sur la conduite avec les aides, les vues et les gâchettes (0.4.2 et 0.5.0).
- **Le pilote par recherche sur la page** (§ 9) : fait le 17/11, voir la fin du § 9.
- **P6**, l'escalade sur les entrées pas à pas, sans règle dessous.

## 9. Le pilote par recherche (P7, 17/11)

`src/drive/planner.js` reprend le principe des bots de Mad Pod Racing : un plan sur les prochains instants, amélioré
par l'escalade de la lib (`createClimb`) à partir du meilleur plan du tour précédent, décalé.
- **Le plan** : pour chaque segment de 0,25 s, un écart de direction et un écart de pédale, ajoutés aux commandes du
  pilote réglé (`TUNED`). Le plan nul est la règle elle-même, et chaque recherche part de lui.
- **La note d'un plan** : on simule l'horizon depuis l'état de la voiture. On compte les mètres gagnés le long de la
  ligne. On retire les mètres qu'il faudrait pour freiner jusqu'au profil (à 40 m/s², une hypothèse), une amende par
  tic hors piste ou en glissade, et l'écart à la ligne en fin d'horizon, multiplié par `stray`.
- **Le banc** (`scripts/p7-planner.js`, par la file) : les 25 pistes, la courbure minimale et la meilleure ligne de
  `data/lines-bicycle/`. La règle et le planificateur partent du même point. Les écarts sont appariés : intervalle à
  95 %, sur les 48 tours que les deux finissent.

Quatre tours de mesure, 23 variantes :

| Variante | Tours finis | Écart au profil | Hors piste | Gagné sur la règle |
|---|--:|--:|--:|--:|
| la règle (`TUNED`) | 48 / 50 | 8,0 % | 17,9 s | – |
| 1,5 s d'horizon, 40 plans | 46 / 50 | 7,8 % | 13,4 s | 0,15 ± 0,19 s |
| la même, 100 plans | 39 / 50 | 8,3 % | 9,6 s | −0,16 ± 0,34 s |
| 2 s, `stray` 3 (3 graines) | 50 / 50 | 6,9 à 7,0 % | 4 à 6 s | 0,82 à 0,91 s |
| 2,5 s, `stray` 6, 40 plans | 50 / 50 | 6,7 % | 0,4 s | 1,02 ± 0,19 s |
| 2,5 s, `stray` 6, 100 plans (2 graines) | 50 / 50 | 5,8 à 6,0 % | 0 à 1 s | 1,61 à 1,71 s |
| **la même, pédale 0,45 (`PLANNER`)** | **50 / 50** | **5,4 %** | **0,1 s** | **2,06 ± 0,23 s** |
| la même, 200 plans | 50 / 50 | 5,5 % | 0,1 s | 1,99 ± 0,20 s |

- **L'effet d'horizon d'abord.** Sans terme de fin, chercher plus fait pire (39 tours finis à 100 plans au lieu de 46).
  La recherche trouve des plans qui gagnent des mètres sur 1,5 s mais laissent la voiture loin de la ligne, là où la
  règle ne la rattrape plus. Une fois l'écart en fin d'horizon compté, chercher plus paie, jusqu'à environ 100 plans.
  C'est la leçon de Mad Pod Racing : la note de la fin du plan compte autant que le plan.
- **Le planificateur finit les deux tours que la règle manque** (Oschersleben et Sakhir, meilleure ligne). Il bat la
  règle sur 46 tours sur 48. Il reste à 5,4 % du profil : le profil suppose un point matériel qui tient sa vitesse de
  virage à la limite, ce que la bicyclette ne fait pas tout à fait.
- **Le coût** : 400 plans par seconde de course, chacun 2,5 s simulées. Il faut environ 13 s de calcul pour une minute
  de course, soit 21 % d'un cœur.

**Sur la page Piloter** (Sami, 17/11), le pilote par recherche est l'adversaire par défaut ; le pilote réglé reste au
choix. Sa recherche prend environ 50 ms toutes les 0,25 s, trop pour le fil de la page : un worker
(`web/planner-worker.js`) conduit sa voiture en avance et passe ses états tick par tick (`src/drive/feed.js`). Il
le peut parce que les voitures ne se touchent pas : la course du pilote ne dépend pas de celle de Sami. La page garde
3 s d'avance et demande 1 s à la fois. Le pilote attend si le worker est en retard, son chrono arrêté. Vérifié dans
Chrome sans fenêtre à Monza : 6 à 12 ms au plus entre deux images, et le tour du pilote fait 1:26,50, comme sous Node
avec la même graine (la règle réglée : 1:26,98 du même départ).

**Décidé avec Sami le 17/11** : la page Piloter prend les lignes de la bicyclette (`data/lines-bicycle/`, § 6 bis),
plus rapides sur les 25 pistes, et à défaut celles du point matériel. La page des lignes garde celles du point
matériel, le modèle des J1 à J3.

## Sources

- G. Perantoni, D. J. N. Limebeer, « Optimal control for a Formula One car with variable parameters », Vehicle System
  Dynamics 52(5), 2014, p. 653-678, annexes A et B : <https://ora.ox.ac.uk/objects/uuid:db0437cc-0b4f-495d-96d5-524ea4bfda5e>
- TUM, `global_racetrajectory_optimization`, `params/racecar.ini` (LGPL-3.0), lu le 15/11/2026 :
  <https://github.com/TUMFTM/global_racetrajectory_optimization>
- TUM, `laptime-simulation`, `F1_Shanghai.ini` : voir [modele.md](modele.md) § 2.
- G. M. Hoffmann, C. J. Tomlin, M. Montemerlo, S. Thrun, « Autonomous Automobile Trajectory Tracking for Off-Road
  Driving », American Control Conference 2007, p. 2296-2301 (le terme de Stanley) :
  <https://doi.org/10.1109/ACC.2007.4282788>
