# D'autres voitures : la Formule E et la Rally2 (17/11)

**La question** ([recherche/voitures.md](recherche/voitures.md)) : la ligne et le pilotage changent-ils avec la
voiture ? **Décidé avec Sami le 17/11** : la Formule E d'abord, la seule voiture sans hypothèse ; puis le rallye sur
la terre, avant la GT3 ; le drift en dernier.

## 1. La voiture

La Formule E de TUM (`FE_Berlin.ini`, `TUM_FE` dans `src/car.js`), dans les termes de notre F1 :

| | F1 | Formule E |
|---|--:|--:|
| Masse | 733 kg | 880 kg |
| Puissance | 575 kW + 120 kW au-delà de 100 km/h | 200 kW (électrique) |
| Appui (cz·A avant + arrière) | 2,20 + 2,68 m² | 1,24 + 1,52 m² |
| Traînée (cw·A) | 1,56 m² | 1,15 m² |
| μx-μy avant, arrière | 1,65-1,85, 1,95-2,15 | 1,22, 1,42 |
| dμ/dFz avant, arrière | −5,0·10⁻⁵ | −2,5·10⁻⁵, −2,0·10⁻⁵ |
| Vitesse de pointe (point matériel) | 312 km/h | 228 km/h |

**Les hypothèses** (le reste vient du fichier) :
- les 200 kW passent par le même rendement de boîte (0,96) que le moteur de la F1 ;
- le couple maximal du moteur (150 Nm) est ignoré : en première, il donne à peu près l'adhérence des pneus arrière ;
- le point matériel prend le dμ/dFz de chaque essieu pondéré par sa part de la charge ; la bicyclette garde celui
  de chaque essieu (pour la F1, les deux sont égaux, ses chiffres ne changent pas) ;
- la bicyclette (`FE_CHASSIS`, `src/drive/bicycle.js`) : le centre de gravité à 0,345 m (le fichier) ; l'inertie
  en lacet de la F1 mise à l'échelle de m·L², 400 kg·m² ; la direction, les pédales et la courbe du pneu de la F1
  (Perantoni et Limebeer). Le pneu de la Formule E est plus dur et moins large : sa courbe n'est pas publiée.

## 2. La mesure

- `node scripts/lines.js --car=fe [--bicycle]` cherche les lignes de la Formule E (`data/lines-fe/`,
  `data/lines-bicycle-fe/`), comme pour la F1 : la même recherche, la même graine, 100 000 tours par étape.
- `node scripts/cars-summary.js --car=fe [--bicycle]` compare, piste par piste, sa ligne et celle de la F1.
- `node scripts/p7-planner.js car=fe id=fe` fait rouler le pilote réglé et le pilote par recherche sur ses lignes.
- `node scripts/p8.js wet|band --bicycle --car=fe` cherche ses lignes de pluie.

Tout est passé par la file le 17/11 (`circuit-fe-*`), sur les 25 pistes.

## 3. Les résultats

**La ligne dépend de la voiture.**

| | Point matériel | Bicyclette |
|---|--:|--:|
| Son tour, en part du tour de la F1 | 148,6 % | 148,0 % |
| Sa ligne gagne, sur la ligne de la F1 | 4,11 s [3,10 ; 5,13], 25/25 | 4,06 s [3,02 ; 5,09], 25/25 |
| Le contrôle : la F1 sur sa ligne perd | 0,71 s [0,61 ; 0,82], 25/25 | 0,70 s [0,60 ; 0,80], 25/25 |
| Les mètres au freinage (la F1) | 18,6 % (16,3 %) | 19,2 % (17,4 %) |

La meilleure ligne de la F1 est même plus lente, pour la Formule E, que la simple courbure minimale, sur 20 pistes
sur 25 : 4,11 s derrière la ligne de la Formule E, quand la courbure minimale est à 2,23 s.

**Où elle passe**, contre la ligne de la F1, dans les virages de celle-ci (`src/analysis/wet.js`) :

| Phase | Point matériel | Bicyclette |
|---|--:|--:|
| 60 m avant | +0,47 m | +0,42 m |
| entrée | −0,08 m | −0,17 m |
| milieu | −0,12 m | −0,17 m |
| sortie | −0,13 m | −0,20 m |
| 60 m après | +0,31 m | +0,31 m |

En mètres vers l'extérieur du virage. La Formule E aborde le virage de plus loin, plus près du bord extérieur, et en
ressort plus large ; dedans, elle serre un peu plus la corde. Elle prend un arc plus grand, pour garder sa vitesse :
avec moins de puissance, chaque km/h perdu dans le virage coûte plus cher à reprendre. La F1, elle, a l'appui pour
passer vite sur un arc plus serré. C'est le « garder sa vitesse » des pilotes, à vérifier virage par virage sur la
page des lignes.

**Les pilotes** (la bicyclette, ses lignes, la courbure minimale et la meilleure) :

| | Le pilote réglé | Le pilote par recherche |
|---|--:|--:|
| Tours finis | 25 / 50 (3 / 25 sur la meilleure ligne) | 48 / 50 |
| Au-dessus du profil | 7,7 % | 7,1 % |

Le pilote par recherche gagne 1,37 s [0,92 ; 1,83] par tour sur la règle, sur les 24 tours que les deux finissent
(21/3). **La règle, réglée pour la F1 (P7), ne tient pas la meilleure ligne de la Formule E** : elle sort sur
22 pistes sur 25. La recherche la rattrape presque partout ; elle échoue à Spielberg et à Zandvoort. Pour la F1, les
deux finissaient 48 et 50 tours sur 50 ([pilote.md](pilote.md) § 9).

**Une règle à elle** (Sami, 17/11 : « ok ») : P7 refait pour la Formule E (`node scripts/p7.js --bicycle --car=fe
marginLow=0.7`, le score d'un tour raté tient compte de la part tenue). La première recherche, la marge entre 0,9 et
1,05, butait sur 0,9 : 46 tours sur 50 à 15,5 %. Élargie à 0,7, la règle `TUNED_FE` (`src/cars.js`) demande 86 % de
la vitesse du profil et regarde 0,1 s devant : **50 tours sur 50, à 18,7 % du profil**. Elle est sûre, mais lente ;
le pilote par recherche qui la corrige finit 49 tours sur 50 à 13,3 % (6,15 s [5,56 ; 6,74] gagnés par tour, 47/2),
moins vite qu'en corrigeant la règle de la F1 (48 tours sur 50 à 7,1 %). **Sur la page, l'adversaire « pilote réglé »
suit `TUNED_FE`, le pilote par recherche corrige la règle de la F1** (`search` dans `src/cars.js`).

**Sous la pluie** (la bicyclette) : la ligne sèche roule à 108,3 % de son temps sec sur la route mouillée (la F1 :
110,6 % pour le point matériel). Moins de son tour dépend de l'adhérence : elle est limitée par sa puissance plus
souvent. Sa ligne de pluie gagne 1,60 s [1,21 ; 1,98] sur la route mouillée, 7,18 s [6,46 ; 7,90] avec la trajectoire
sèche glissante, 25/25.

**Les limites.** Le tour de la Formule E n'a pas d'équivalent réel sur ces pistes : elle court en ville. Le chiffre
qui compte est la comparaison, la même recherche sur les deux voitures. La courbe du pneu est celle de la F1.

## 4. Sur la page

La page Piloter (0.9.0, la Rally2 en 0.10.0) a un menu **Voiture** : la F1, la Formule E ou la Rally2 sur la terre. La voiture de Sami, le pilote (dans son
worker) et le fantôme deviennent des Formule E, sur les lignes cherchées pour elle, au sec comme sous la pluie. Sans
ses lignes, la page prend celles de la F1 et le dit. Le meilleur tour se garde par voiture. Chaque voiture a sa règle
(l'adversaire « pilote réglé ») et la règle que corrige son pilote par recherche.

## 5. La Rally2 sur la terre

**Décidé avec Sami le 17/11** : μ = 0,5 sur la terre et la moitié de la traction à l'avant, deux hypothèses à
remplacer si une meilleure source apparaît. La voiture (`RALLY2`, `src/cars.js`) :

| | Rally2 | La source |
|---|--:|---|
| Masse | 1 230 kg | le minimum de la FIA (Wikipédia) |
| Empattement | 2,563 m | Wikipédia, Škoda Fabia RS Rally2 |
| Puissance | 214 kW (289 ch), 430 Nm | Škoda |
| Transmission | 4 roues, sans différentiel central | Škoda : le règlement l'interdit |
| μ sur la terre | 0,5, les deux sens, les deux essieux | Velenis, Tsiotras et Lu (SAE 2008), d'après le résumé : à confirmer |
| Traction à l'avant | 50 % | hypothèse (Sami, 17/11) |
| Charge à l'avant | 60 % | hypothèse : un moteur transversal à l'avant |
| Appui | aucun | hypothèse |
| cw·A | 0,8 m² | hypothèse : Cx 0,4 sur 2 m² |
| Inertie en lacet | 1 940 kg·m² | hypothèse : m·lf·lr, l'indice dynamique 1 d'une voiture de route |
| Centre de gravité | 0,45 m | hypothèse |

Sans rapports de boîte, elle atteint 261 km/h en ligne droite, bien plus qu'une vraie Rally2 réglée pour une spéciale.
Toutes les pistes sont en terre. La courbe du pneu reste celle de la F1 : sur la terre, le pic viendrait à un angle
plus grand, une hypothèse de plus que nous n'avons pas prise.

**Les quatre roues motrices** dans le modèle : le fichier de chaque voiture dit la part de la traction à l'avant
(`driveFront`, 0 pour la F1 et la Formule E). Le point matériel tire sur chaque essieu sa part, dans son adhérence ;
la bicyclette aussi, et la force de l'avant prend sur son ellipse. La F1 ne change pas (les empreintes tiennent).

**La ligne** (le point matériel, entre parenthèses la bicyclette) : son tour fait 233 % du tour de la F1 (226 %). Sa
ligne gagne **13,29 s [10,88 ; 15,71]** sur celle de la F1 (11,72 s [9,48 ; 13,96]), 25/25 ; la F1 perd 1,61 s sur
la sienne (1,36 s). Elle passe 37 % du tour au freinage, la F1 16 %. Contre la ligne de la F1 :

| Phase | Point matériel |
|---|--:|
| 60 m avant | +1,31 m |
| entrée | −0,48 m |
| milieu | −0,11 m |
| sortie | −0,55 m |
| 60 m après | +1,61 m |

Le même dessin que la Formule E, trois fois plus marqué : elle arrive de bien plus loin à l'extérieur, plonge vers la
corde dès l'entrée et ressort large. Avec deux fois moins d'adhérence et sans appui, le virage se prend lentement et
la ligne cherche le rayon le plus grand.

**Les pilotes ne la tiennent pas.** La règle de la F1 part en tête-à-queue dès le premier virage, sur toutes les
pistes. Ce n'est ni la terre ni les quatre roues : avec l'inertie de la F1 (450 kg·m²), la même voiture finit le carré
des tests à 9 % de son profil. Seule, sans pilote, elle est stable. Mais elle est lente à pivoter et neutre à la
limite : ses deux essieux ont le même μ et chacun la charge qu'il lui faut dans le virage, rien ne la garde du
survirage (la F1 et la Formule E ont 16 % d'adhérence de plus à l'arrière). P7 (`marginLow=0.6`) la fait rouler à
65 % de la vitesse du profil : **22 tours sur 50, à 53,5 %** du profil. Le pilote par recherche en finit **46 sur 50**,
à 51,8 % (3,19 s [2,25 ; 4,13] gagnés, 22/0). Les deux restent loin de la limite : le profil est hors de leur portée,
et la question du pendule (le contre-braquage avant le virage) ne se pose pas encore. Elle se posera avec un pilote
qui tient la voiture en dérive, ou entre les mains de Sami : la Rally2 est sur la page.

**Les limites.** Le μ de la terre n'est pas confirmé, la répartition des masses et l'inertie sont supposées, le pneu
est celui de la F1. Le résultat qui tient : sur une piste deux fois moins adhérente, sans appui, la ligne change
beaucoup (13 s), dans le sens que prend déjà la Formule E.

## Sources

- TUM, `laptime-simulation`, `laptimesim/input/vehicles/FE_Berlin.ini` et `F1_Shanghai.ini` (LGPL-3.0), lus le
  17/11/2026 : <https://github.com/TUMFTM/laptime-simulation>
- Wikipédia, Škoda Fabia RS Rally2 : <https://en.wikipedia.org/wiki/%C5%A0koda_Fabia_RS_Rally2>
- Škoda Storyboard, la transmission de la Fabia RS Rally2 :
  <https://www.skoda-storyboard.com/en/press-kits/skoda-fabia-rs-rally2-press-kit/drive-newly-developed-turbo-engine-sequential-gearbox-and-all-wheel-drive/>
- E. Velenis, P. Tsiotras, J. Lu, « Modeling aggressive maneuvers on loose surfaces: the cases of Trail-Braking and
  Pendulum-Turn » (ECC 2007) et l'article SAE 2008 : leurs PDF ne répondaient plus le 17/11 (404, 403).
- Les mesures : `tmp/p7/cmaes-bicycle-*-seed-1*.json`, `tmp/p7-planner/{fe-rule,rally-rule}-g*.json`,
  `data/lines-rally/`, `data/lines-bicycle-rally/`, `tmp/p7-planner/fe.json`, `data/lines-fe/`, `data/lines-bicycle-fe/`, `data/lines-wet-bicycle-fe/`
  (ignorés par git, refaits par les commandes du § 2).
