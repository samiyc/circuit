# D'autres voitures (cadrage du 17/11)

**Décidé avec Sami le 17/11** : la voiture « à la Trackmania » (P8 bis) est abandonnée. Sami : « c'est trop loin des
modèle réel, ça serai fun, mais autant que je joue au jeux ». À la place, on essaie **d'autres types de voitures
réelles**, au plus près des voitures de circuit, puis le drift et le rallye, selon les données publiques.

La question reste celle de P2 et P8 : **la ligne et le pilotage changent-ils avec la voiture comme les pilotes le
disent ?** Une Formule E sans appui freine tôt et garde sa vitesse ; une GT lourde prend les virages en V ; une
voiture de rallye sur la terre tourne en glissant.

**Décidé avec Sami le 17/11, au soir** (« ok pour les pistes 1 à 3 ») : la Formule E d'abord, avec un menu Voiture
sur la page Piloter ; puis le rallye sur la terre, avant la GT3 ; le drift en dernier, quand le modèle du pneu tiendra
les grands angles. **La Formule E et la Rally2 sont mesurées** : [../voitures.md](../voitures.md).

## 1. Ce qu'on sait de chaque voiture

| Voiture | Masse | Puissance | Transmission | Appui, adhérence | La source | Qualité |
|---|--:|--:|---|---|---|---|
| F1 (la nôtre) | 733 kg | 575 + 120 kW | arrière | tout | TUM, `F1_Shanghai.ini` | complète |
| Formule E | 880 kg | 200 kW | arrière | cz·A 1,24 + 1,52 m², cw·A 1,15 m², μ 1,22 avant, 1,42 arrière | TUM, `FE_Berlin.ini` | complète |
| Le Mans Hypercar | 1 030 kg au moins | ≈ 500 kW (520 dans le premier texte de la FIA) | arrière ou hybride 4 roues | rien de publié | FIA, Motor Sport | partielle, et la BoP change tout |
| GT3 | 1 230 à 1 350 kg | ≈ 416 kW (565 ch, selon la BoP) | arrière | rien de publié | Porsche, 51GT3 | partielle |
| Rally2 (rallye) | 1 230 kg au moins | 4,2 kg/ch au plus, ≈ 290 ch | 4 roues | sur la terre, μ ≈ 0,5 | Rally Sweden, Wikipédia ; Velenis 2008 | partielle |
| Drift (Formula Drift) | ≈ 1 370 kg (une Supra, 3 020 lb) | 750 à plus de 1 000 ch | arrière, différentiel bloqué | pneus limités en largeur selon la masse | Driving Line, Speedhunters | faible pour le modèle |

**Ce qui manque.** Hors TUM, personne ne publie l'appui aérodynamique ni le μ des pneus d'une voiture de course.
Pour la GT3 et l'Hypercar, il faudrait des hypothèses : des ordres de grandeur pris dans les simulateurs ou les
mémoires d'étudiants. Pour la terre, Velenis, Tsiotras et Lu (SAE 2008) prennent μ = 0,5 ; leur PDF a disparu du site
de Georgia Tech, seul le résumé confirme le chiffre. Pour le drift, le labo de Stanford (Gerdes) a une Supra « aux
spécifications Formula Drift », Takumi. Ses paramètres seraient dans Weber et Gerdes (IEEE T-IV, 2023), pas encore lu ;
l'article de 2024 n'en publie aucun.

## 2. Ce que le modèle doit apprendre

- **Une voiture par fichier** : la bicyclette lit déjà le format de TUM, donc la Formule E entre telle quelle.
- **Les quatre roues motrices** (rallye, Hypercar hybride) : une part de la traction sur l'avant. La bicyclette ne
  fait aujourd'hui tirer que l'arrière.
- **La terre** : la surface de J5 (`src/profile/surface.js`) donne déjà une adhérence par point. Une piste toute en
  terre, c'est `wet` = 0,5 / μ de la voiture, au lieu de 0,83. Les pneus de terre glissent autrement (le pic d'adhérence
  vient à un angle de dérive plus grand) : une hypothèse de plus.
- **Le drift** ne se juge pas au chrono : des juges notent l'angle, la ligne et le style. Le labo de Stanford tient
  un angle de dérive fixe (−40° sur un cercle de 15 m). Il faudrait un autre objectif que le temps au tour : c'est une
  question pour Sami (§ 3).

## 3. Le plan (l'ordre décidé le 17/11 : 1, 3, 2, 4)

1. **La Formule E**, sans hypothèse : la ligne cherchée, le pilote réglé et le pilote par recherche sur les 25 pistes,
   comparés à la F1. Est-ce que la ligne change avec moins d'appui et moins de puissance ? Elle doit aussi être
   jouable sur la page Piloter, un menu Voiture.
2. **La GT3**, avec ses hypothèses écrites (l'appui, le μ) : une voiture lourde, sans tout l'appui d'une F1.
3. **Le rallye sur la terre** : les quatre roues motrices et μ ≈ 0,5. Le pilote par recherche retrouve-t-il le
   freinage en courbe et le « pendule » (le contre-braquage avant le virage) que Velenis décrit chez les pilotes de
   rallye ?
4. **Le drift**, une fois son objectif décidé.

## Sources

- TUM, `laptime-simulation`, `laptimesim/input/vehicles/FE_Berlin.ini` (LGPL-3.0), lu le 17/11/2026 :
  <https://github.com/TUMFTM/laptime-simulation>
- Motor Sport, « What is a Le Mans Hypercar? » :
  <https://www.motorsportmagazine.com/articles/sports-cars/le-mans-hypercar-latest-entries-rules-and-specs-for-the-new-sports-car-category>
- FIA, règlement technique LMH 2024 : <https://www.fia.com/sites/default/files/2024_lmh_wmsc_2023.10.19_published_2023.10.19.pdf>
- Stuttcars, Porsche 911 GT3 R (992.1) : <https://www.stuttcars.com/porsche-911-gt3-r-992-1/>
- 51GT3, « Technical Overview of GT3, GT4 and GTC Race Car Categories » :
  <https://51gt3.com/en/article/101275/technical-overview-of-gt3-gt4-and-gtc-race-car-categories>
- Rally Sweden, « WRC 2024 – The Cars » : <https://rallysweden.com/en/article/wrc-2024-the-cars/>
- Wikipédia, Group Rally2 : <https://en.wikipedia.org/wiki/Group_Rally2>
- E. Velenis, P. Tsiotras, J. Lu, travaux sur le freinage en courbe et le pendule sur sol meuble (ECC 2007, SAE
  2008). L'article SAE 2008 prend μ = 0,5 pour la terre ; son PDF, <https://dcsl.gatech.edu/papers/sae08.pdf>, ne
  répondait plus le 17/11, le chiffre vient de l'extrait du moteur de recherche : à confirmer.
- N. D. Broadbent, T. Weber, D. Mori, J. C. Gerdes, « Neural Network Tire Force Modeling for Automated Drifting »,
  AVEC 2024 : <https://arxiv.org/html/2407.13760v1>
- Driving Line, « Formula Drift: 20 Years of Increasing Horsepower » :
  <https://drivingline.com/articles/formula-drift-20-years-of-increasing-horsepower>
