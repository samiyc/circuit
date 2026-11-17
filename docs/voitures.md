# D'autres voitures : la Formule E (17/11)

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

**Sous la pluie** (la bicyclette) : la ligne sèche roule à 108,3 % de son temps sec sur la route mouillée (la F1 :
110,6 % pour le point matériel). Moins de son tour dépend de l'adhérence : elle est limitée par sa puissance plus
souvent. Sa ligne de pluie gagne 1,60 s [1,21 ; 1,98] sur la route mouillée, 7,18 s [6,46 ; 7,90] avec la trajectoire
sèche glissante, 25/25.

**Les limites.** Le tour de la Formule E n'a pas d'équivalent réel sur ces pistes : elle court en ville. Le chiffre
qui compte est la comparaison, la même recherche sur les deux voitures. La courbe du pneu est celle de la F1.

## 4. Sur la page

La page Piloter (0.9.0) a un menu **Voiture** : la F1 ou la Formule E. La voiture de Sami, le pilote (dans son
worker) et le fantôme deviennent des Formule E, sur les lignes cherchées pour elle, au sec comme sous la pluie. Sans
ses lignes, la page prend celles de la F1 et le dit. Le meilleur tour se garde par voiture.

## Sources

- TUM, `laptime-simulation`, `laptimesim/input/vehicles/FE_Berlin.ini` et `F1_Shanghai.ini` (LGPL-3.0), lus le
  17/11/2026 : <https://github.com/TUMFTM/laptime-simulation>
- Les mesures : `tmp/p7-planner/fe.json`, `data/lines-fe/`, `data/lines-bicycle-fe/`, `data/lines-wet-bicycle-fe/`
  (ignorés par git, refaits par les commandes du § 2).
