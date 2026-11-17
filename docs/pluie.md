# La pluie (J5, P8)

La question de P8 ([recherche/pistes.md](recherche/pistes.md)) : sous la pluie, la ligne de l'optimiseur change-t-elle
comme un pilote l'attend ? Les écoles de pilotage répondent pour la ligne de pluie : la trajectoire sèche devient la
plus glissante, on freine et on braque à côté, plus large à l'entrée, et on ne la croise que là où il le faut
([recherche/questions.md](recherche/questions.md) § 4, question 3). Décidé avec Sami le 13/11 : la route mouillée
d'abord, puis par endroits.

## 1. Le modèle

**Une adhérence par point** (`src/profile/surface.js`). La voiture porte une surface, la route du jour. Le profil de
vitesse multiplie par l'adhérence du point toutes les forces que les pneus donnent : la vitesse de virage, la traction
et le freinage. Sur une route sèche, l'adhérence vaut 1 partout et rien ne change : les empreintes du modèle sont les
mêmes. Le coût d'un tour au banc : +1 % au pas de 5 m, +6 % à 10 m, +10 % à 20 m, un coût fixe par tour.

**La route mouillée** : μ × `WET` partout. Aucune source ne donne le μ d'un pneu pluie de F1. En revanche, Pirelli
donne une règle de temps au tour : on passe des slicks aux intermédiaires quand le tour atteint 110 à 112 % du tour
sec, et des intermédiaires aux pneus pluie vers 115 à 118 %. **`WET` = 0,83** est donc calé pour que la meilleure ligne
sèche fasse 111 % de son temps sec, le milieu de la fourchette des intermédiaires. C'est la médiane des 25 pistes : 0,829,
de 0,73 à IMS (un ovale, presque tout à fond) à 0,85 à Brands Hatch. L'appui aérodynamique ne change pas.

**La trajectoire sèche glissante** : sur une bande autour de la meilleure ligne sèche, l'adhérence perd `drop` de plus
au centre, puis le perd en douceur jusqu'à `half` mètres de la ligne : (1 − d²/half²)². La forme est lisse pour que la
recherche sente la pente. **La largeur et la perte sont des hypothèses** : les sources disent que la trajectoire est
plus glissante (le caoutchouc qui remonte, l'asphalte poli), aucune ne le mesure. `half` = 1,5 m (la largeur d'une
F1, 2 m, plus une marge) ; `drop` = 15 %, et 30 % pour voir ce que la perte change.

## 2. La mesure

`node scripts/p8.js <condition>` cherche la ligne de pluie comme `npm run lines` cherche la ligne sèche : la même
recherche (`src/search/best-line.js`), depuis la courbure minimale, graine 1, 100 000 tours par étage. Elle écrit
`data/lines-wet/<condition>/`. Trois conditions, une tâche de la file chacune :

- `wet` : la route mouillée seule ;
- `band` : la route mouillée et la bande de la trajectoire sèche à 15 % ;
- `band30` : la même bande à 30 %.

`node scripts/p8-summary.js` compare la ligne de pluie à la ligne sèche conduite sur la même route mouillée : le temps
gagné, avec son intervalle à 95 %. Il lit aussi où va la ligne de pluie dans chaque phase des virages de la ligne
sèche (`src/analysis/wet.js`). Les phases sont les 60 m avant le virage, ses trois tiers (entrée, milieu, sortie) et
les 60 m après. Pour chacune : les mètres vers l'extérieur, et la part de la perte de la bande subie (1 sur la
ligne sèche, 0 hors de la bande).

## 3. Les résultats (17/11)

Mesuré par la file le 17/11, 25 pistes par condition, sur le point matériel (`scripts/p8-summary.js`).

| Condition | La ligne sèche sous la pluie | La ligne de pluie gagne | Pistes où elle gagne |
|---|--:|--:|--:|
| route mouillée | 110,6 % du temps sec | 1,30 s [0,98 ; 1,62] | 25 / 25 |
| et la bande à 15 % | 122,2 % | 6,52 s [5,67 ; 7,38] | 25 / 25 |
| et la bande à 30 % | 138,6 % | 17,33 s [15,65 ; 19,02] | 25 / 25 |

Où va la ligne de pluie, par phase des virages de la ligne sèche : les mètres vers l'extérieur, et la part de la
perte de la bande subie.

| Phase | Mouillée | Bande 15 % | Bande 30 % |
|---|--:|--:|--:|
| 60 m avant | 0,37 m | 0,26 m · 47 % | 0,16 m · 37 % |
| entrée | 0,12 m | 0,62 m · 46 % | 0,97 m · 34 % |
| milieu | 0,00 m | 1,05 m · 32 % | 1,50 m · 20 % |
| sortie | 0,06 m | 0,41 m · 38 % | 0,56 m · 31 % |
| 60 m après | 0,52 m | 0,37 m · 45 % | 0,19 m · 36 % |

**Ce que la mesure dit :**

- **La route mouillée seule change peu la ligne.** Elle passe aux mêmes cordes (0,00 m au milieu des virages) et
  s'élargit un peu avant et après. Elle gagne pourtant 1,3 s sur la ligne sèche, sur les 25 pistes : avec moins
  d'adhérence pour la même puissance, le meilleur compromis entre la vitesse de virage et la ligne droite se déplace.
  **Le témoin** : sur une route sèche, la ligne de pluie est plus lente que la ligne sèche sur les 25 pistes
  (0,20 s en moyenne ; 1,6 s et 2,8 s pour celles des bandes). Le gain vient donc de la pluie, pas d'une recherche
  meilleure : chaque ligne gagne sous son temps.
- **Avec la bande, l'optimiseur quitte la trajectoire sèche, et surtout au milieu du virage.** À la corde, la ligne
  sèche frôle le bord intérieur : la ligne de pluie passe 1 à 1,5 m plus à l'extérieur et n'y subit qu'un tiers à un
  cinquième de la perte. C'est le « tour par l'extérieur » des écoles.
- **Elle reste près de la ligne sèche au freinage et en sortie** (près de la moitié de la perte subie). Là, la ligne
  sèche longe le bord extérieur : s'en écarter, c'est rentrer vers l'intérieur et resserrer le virage. L'entrée « plus
  large » des écoles n'apparaît donc qu'à moitié (0,6 à 1 m vers l'extérieur au premier tiers du virage) ; la sortie
  « en ligne droite » ne se lit pas dans cette mesure.
- **Plus la bande glisse, plus la ligne s'en écarte**, aux mêmes endroits. Les écarts restent bornés par la largeur
  de la bande, une hypothèse : à 1,5 m, s'écarter de 1 m suffit à éviter 70 % de la perte. Une bande plus large
  pousserait la ligne plus loin, au prix de virages plus serrés.

**La bande de 3 m** (`wide`, 15 %, mesurée le 17/11, demandée par Sami) : la ligne de pluie gagne 4,98 s
[4,24 ; 5,72], 25/25, moins qu'avec la bande de 1,5 m.

| Phase | Bande 1,5 m | Bande 3 m |
|---|--:|--:|
| 60 m avant | 0,26 m · 47 % | 0,52 m · 67 % |
| entrée | 0,62 m · 46 % | 0,71 m · 66 % |
| milieu | 1,05 m · 32 % | 1,17 m · 55 % |
| sortie | 0,41 m · 38 % | 0,40 m · 55 % |
| 60 m après | 0,37 m · 45 % | 0,47 m · 59 % |

Avec une bande deux fois plus large, la ligne ne s'écarte presque pas plus (quelques dizaines de centimètres avant le
virage et à l'entrée) : elle subit davantage la bande au lieu de la fuir. S'en écarter de 3 m coûterait trop de
rayon. **L'entrée large des écoles ne vient donc pas de la bande seule** dans notre modèle. D'autres causes que nous
ne modélisons pas peuvent la donner : l'eau qui stagne à la corde, les vibreurs et les peintures glissants, le dévers.

**Les limites.** Le point matériel n'a pas de dérapage. La bande suit la meilleure ligne sèche de *notre* modèle, pas
la gomme d'une vraie course. La perte et la largeur de la bande sont des hypothèses, la réponse en dépend.

## 4. Sur la page

**La page Piloter** (0.8.0) a le même menu Météo. La voiture de Sami, le pilote (dans son worker aussi) et le
fantôme roulent sur la même route : l'état de la voiture porte l'adhérence sous elle (`roadGrip`,
`src/drive/run.js`), mise à chaque tic depuis la surface ; l'écart à la ligne sèche se mesure en travers de la piste.
Le panneau donne l'adhérence sous la voiture. La ligne suivie est la ligne de pluie de la bicyclette
(`node scripts/p8.js wet|band --bicycle`, `data/lines-wet-bicycle/`), qui gagne comme celle du point matériel :
1,22 s [0,91 ; 1,54] sur la route mouillée, 6,59 s [5,82 ; 7,35] avec la bande, 25/25. À Monza, avec la bande, la
suivre au lieu de la ligne sèche fait gagner 5,0 s à la règle réglée (95,07 s) et 3,8 s au pilote par recherche
(95,11 s), pour un profil de 89,56 s.

La page des lignes a un menu Météo : sec, pluie, ou pluie avec la trajectoire sèche glissante (15 %). Sous la pluie,
toutes les lignes roulent sur la route mouillée, et la ligne de pluie (P8) s'ajoute si `scripts/p8.js` l'a cherchée.
Elle se compare alors à la meilleure ligne sèche, virage par virage.

## Sources

- Pirelli, « When it's time to change from slick to wet tyres in Formula 1 » (110 à 112 % du tour sec pour les
  intermédiaires) : <https://www.pirelli.com/global/en-ww/race/when-it-s-time-to-change-from-slick-to-wet-tyres-in-formula-1>
- Motorsport.com, « What Pirelli wants to change about the F1 tyre nobody ever uses » (M. Isola : le passage aux pneus
  pluie à 118 % du tour sec) :
  <https://www.motorsport.com/f1/news/what-pirelli-wants-to-change-about-the-f1-tyre-nobody-ever-uses-/10735569/>
- Track Titan, « Why you should avoid the racing line in the wet » :
  <https://www.tracktitan.io/post/why-you-should-avoid-the-racing-line-in-the-wet>
- Building Speed, « How tracks take and lose rubber » : <https://buildingspeed.org/2016/08/05/how-tracks-take-and-lose-rubber/>
