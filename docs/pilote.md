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
- **La vue** : la caméra suit la voiture, son cap vers le haut. Le champ grandit avec la vitesse (2,5 s de route plus
  60 m) pour voir le point de freinage, et une carte du circuit tient dans un coin.
- **Le panneau** :
  - la vitesse ;
  - le temps du tour et l'écart au fantôme au même point ;
  - le dernier tour et son temps hors piste ;
  - le meilleur tour propre, gardé dans le navigateur ;
  - le dernier tour du pilote.

## 8. La suite

- **Le retour de Sami** sur le pilotage : la direction au clavier, la butée réduite, le champ de vue. Ce sont des
  hypothèses de jeu, à régler sur son ressenti.
- **Les pilotes par recherche** : le faisceau et l'escalade sur un plan de quelques pas, comme sur Mad Pod Racing, contre
  le pilote réglé.
- **P6**, l'escalade sur les entrées pas à pas, après.

**Question pour Sami** : faut-il recalculer les lignes pour la bicyclette, avec son profil au μy de l'avant ? Je le
recommande : la meilleure ligne actuelle est cherchée pour une voiture qui tourne 4 % plus vite. Le fantôme de la page
Piloter suit déjà le profil de la bicyclette ; c'est la forme de la ligne qui reste celle du point matériel. Cela coûte
une nuit de file (25 pistes à 25 s), et la page des lignes changerait de temps.

## Sources

- G. Perantoni, D. J. N. Limebeer, « Optimal control for a Formula One car with variable parameters », Vehicle System
  Dynamics 52(5), 2014, p. 653-678, annexes A et B : <https://ora.ox.ac.uk/objects/uuid:db0437cc-0b4f-495d-96d5-524ea4bfda5e>
- TUM, `global_racetrajectory_optimization`, `params/racecar.ini` (LGPL-3.0), lu le 15/11/2026 :
  <https://github.com/TUMFTM/global_racetrajectory_optimization>
- TUM, `laptime-simulation`, `F1_Shanghai.ini` : voir [modele.md](modele.md) § 2.
- G. M. Hoffmann, C. J. Tomlin, M. Montemerlo, S. Thrun, « Autonomous Automobile Trajectory Tracking for Off-Road
  Driving », American Control Conference 2007, p. 2296-2301 (le terme de Stanley) :
  <https://doi.org/10.1109/ACC.2007.4282788>
