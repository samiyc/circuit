# Les questions pour Sami, et pour un professionnel

Rédigé le 13/11/2026. Sami a répondu le jour même ; ses réponses sont citées telles quelles, suivies de ce que le
projet en tire. Il a fait une remarque juste sur le titre :

> « Pour moi un vrais professionnel serai plus qqun du milieu des course automobile, mécanicien/pilote. »

Sami est donc **le joueur**. Il sait ce qu'est une bonne ligne dans Trackmania et ce qu'est une bonne prise en main.
**Le professionnel**, un pilote ou un mécanicien de course, n'est pas cherché pour le moment (Sami, 13/11 au soir).
Ses questions sont au § 4, avec ce qu'en disent les écoles de pilotage et les articles.

## 1. Le jeu (Sami, le joueur)

1. **Quel Trackmania as-tu le plus joué ?**
   Sami : « tmnf, tm2 canyon/stadium/valley, et la dernière version également ».
   → Nations Forever, les trois environnements de TM2 et Trackmania 2020. Les sources de [trackmania.md](trackmania.md)
   portent surtout sur Nations Forever ; elles couvrent donc son terrain.

2. **Qu'est-ce qui fait une bonne ligne, en jeu ?**
   Sami : « extérieur -> dérappage -> intérieur -> extérieur, ou bien pleine vitesse, si le virage est suffisamment
   ouvert. en général sur trackmania il ne faut presque jamais lever le pied de l'accelerateur. sinon on perd beaucoup
   de temps. »
   → Deux enseignements. **(a)** Un virage assez ouvert se passe à fond : le profil de vitesse doit le retrouver seul
   (la vitesse limite du virage dépasse la vitesse atteinte). **(b)** Dans Trackmania, on ne lâche presque jamais
   l'accélérateur ; on règle la vitesse par le dérapage. C'est une physique de jeu. Sur une vraie voiture, on freine
   fort avant les virages lents ([ligne-ideale.md](ligne-ideale.md) § 2). Le contraste est un bon test de notre
   modèle : une voiture « à la Trackmania » (P8 bis, [pistes.md](pistes.md)) doit retrouver le pied au plancher.

3. **Le dérapage compte-t-il ?**
   Sami : « Oui je suis très familié avec le mode tech, beaucoup de dérappage, drift en gros. mais on est loin du
   réalisme des vrais voiture, F1, courses sur circuits. »
   → **Décision** : la cible est la voiture réelle (F1, circuits). Le dérapage arrive avec le modèle de pneu qui sature
   (J4) ; le dérapage « à la Trackmania », exagéré, serait une variante de jeu, plus tard.

4. **Les surfaces**
   Sami : « ça change l'aderance, ça peut ajouter des nuances, pour les calcules, comme par exemple une route
   mouillé ».
   → **Décision** : l'adhérence varie par portion de piste et par météo. **La route mouillée** devient le premier cas
   (P8) : un μ plus bas, partout ou par endroits. La ligne de pluie diffère de la ligne sèche, c'est une question
   pour le professionnel (§ 4).

5. **Le kart, les tracés**
   Sami : « Pas particulièrement, on vas resté sur des piste formule 1, le mans, j'imagine qu'il y a plus de data par
   rapport au pistes/voitures ? »
   → **Décision** : des circuits de F1 et Le Mans. **Les données** (vérifiées le 13/11 au soir) :
   - **les pistes** : la base de TU Munich a **25 circuits** ([bancs.md](bancs.md) § 1), sous licence LGPL-3.0 (lue
     sur le dépôt). **Le Mans n'y est pas.** Il faudra une autre source pour la Sarthe ; **hypothèse** : le tracé
     d'OpenStreetMap (licence ODbL), avec une largeur supposée. À chercher quand on en aura besoin, pas au J1 ;
   - **les voitures** : le dépôt `laptime-simulation` de TU Munich (LGPL-3.0) donne une **F1 complète**
     (`F1_Shanghai.ini`) : 733 kg, un appui de 2,20 m² à l'avant et 2,68 m² à l'arrière (c_z·A), une traînée de
     1,56 m² (c_w·A), 575 kW plus 120 kW électriques, huit rapports, et des pneus à μ 1,65 à 1,95 en long et 1,85 à
     2,15 en travers, qui baissent quand la charge monte. Le cercle d'adhérence y a un exposant réglable (2, un vrai
     cercle). Il y a aussi une Formule E (`FE_Berlin.ini`). **L'hypothèse μ ≈ 1,5 à 2 est donc sourcée** pour les
     pneus seuls ; l'appui s'ajoute avec le carré de la vitesse.

## 2. Les commandes et l'écran

6. **Clavier ou manette ?**
   Sami : « les deux, un peut de lag à la manette, mais plus agréable long terme. accélérer fléche-haut/A, frein
   Ctrl-gauche/RB, et gauche/droite via pad-gauche ou fléches ».
   → **Décision** : les deux, dès J4.

   Sami, plus tard le même soir : « il faudra surement utiliser la gachette RT pour le freinage dégréssif ».
   → Juste : le freinage dégressif dose le frein en relâchant à mesure qu'on tourne (§ 4, question 2). Il faut une
   commande **analogique**. RB et Ctrl ne donnent que tout ou rien.

   | Action | Clavier | Manette |
   |---|---|---|
   | accélérer | flèche haut (tout ou rien) | A (tout ou rien) ; LT pour doser, si le besoin vient (**hypothèse**) |
   | freiner | Ctrl gauche (tout ou rien) | **RT, analogique** (le freinage dégressif) ; RB en tout ou rien |
   | tourner | flèches gauche / droite | stick gauche (analogique) |

   **Hypothèse** : au clavier, une touche tenue monte le frein en rampe (quelques dixièmes de seconde), comme les
   jeux le font pour la direction. Sinon le clavier ne pourra pas freiner en dégressif, et il perdra du temps sur la
   manette : ce sera à mesurer, pas à corriger.

   La manette passe par la Gamepad API du navigateur. Le « lag » sera mesuré (le délai entre l'appui et la commande
   lue). Les deux entrées passent par une même fonction pure, que les tests simulent, comme dans raquette.

7. **Le fantôme, et les collisions**
   Sami : « Le fantome est pratique pour voir quel ligne on a fait précédemment. la grande question est, est-ce que
   l'on gère les colissions avec l'autre voiture ou l'on reste sur le mode de trackmania sans colision. surement plus
   simple. la collission serait complex a gérer. »
   → **Décision** : **pas de collision**, comme dans Trackmania. Les autres voitures sont des fantômes : ta course
   précédente, la ligne idéale, le pilote robot. P10 (plusieurs voitures) devient une course de fantômes, sans
   dépassement à gérer.

8. **Les vues** (réponse à la question 10, dans la conversation du 13/11)
   Sami : « vue similair a raquette, vue de dessus/face/profil ».
   → **Décision** : comme la page de raquette, qui montre la table vue de dessus avec un bandeau de profil.
   - **La vue de dessus** : la piste, la ligne colorée par la vitesse, les fantômes.
   - **La vue de profil** : la vitesse le long du tour (le profil de vitesse, où l'on voit les freinages), et
     l'altitude le jour où une piste en aura.
   - **La vue de face** : la voiture vue de derrière, simplifiée, avec le bord de piste. **Hypothèse** : elle sert
     au pilotage de Sami (J4), pas à l'analyse (J3).

## 3. Les décisions de projet

9. **Le solveur QP dans la lib**
   Sami : « ok pour le solveur dans la lib ».
   → **Décidé** : il s'écrit dans `mcts-commun`, avec ses tests et son banc, quand `circuit` (P4) ou `reseau` (le
   DC-OPF) en aura besoin, le premier des deux. P1 s'en passe avec une descente projetée.

10. **La base de pistes de TU Munich**
    Sami : « ok ».
    → **Décidé** : un script la télécharge dans un dossier ignoré par git. Rien n'est copié dans le dépôt tant que
    la licence n'est pas lue.

11. **Pas de branchement sur Trackmania**
    Sami : « oui pour le moment on peut resté sur un vue simplifié du dessus et de profil/face comme dans raquette ».
    → **Décidé, pour le moment** : ni greffon, ni TMInterface, ni automatisation du jeu. Notre propre simulation, vue
    de dessus, de profil et de face.

## 4. Les questions pour un professionnel (pilote ou mécanicien)

Sami, 13/11 au soir : « pas pour le moment, vérifier/chercher sur internet et dans les papiers de recherche pour le
moment ». Personne n'est donc contacté. Chaque question a ci-dessous ce qu'en disent les écoles de pilotage et les
articles, cherché le 13/11. **Les écoles** (Driver61, HP Academy, Ross Bentley) sont des sources de métier, pas des
mesures. **Les articles** sont plus sûrs, mais ils répondent rarement à la question telle qu'un pilote la pose. Ce qui
reste ouvert le dit. Notre simulation tranchera une partie des questions seule (la colonne « Ce que le projet vérifie »).

| # | Question | Ce que disent les sources | Ce que le projet vérifie |
|---|---|---|---|
| 1 | le point de freinage | des repères fixes (panneaux, vibreurs), affinés tour après tour | le profil le calcule (passe arrière) |
| 2 | le freinage dégressif | la norme, parce que l'adhérence se partage | la ligne de P2 doit freiner en tournant |
| 3 | la ligne de pluie | hors de la trajectoire sèche, plus glissante | P8, si l'on y met un μ par bande |
| 4 | les virages enchaînés | avant une longue ligne droite, on sacrifie l'entrée | P2 doit le retrouver seul |
| 5 | le réglage | l'adhérence pèse le plus ; appui et traînée s'échangent | P11, avec la F1 de TU Munich |
| 6 | les pneus qui chauffent | ça compte sur un relais, pas sur un tour | hors du projet |

1. **Le point de freinage** : comment le choisit-on sur un circuit inconnu ?
   Les écoles disent la même chose. On prend des **repères fixes**, d'abord les panneaux de distance, puis un vibreur
   ou un bâtiment, et plus d'un repère par action. Le point de corde reste fixe, le point de freinage se déplace d'un
   tour à l'autre (Blayze ; Simracing Cockpit). On l'affine en partant de trop tôt, puis on recule.
   → **Pour nous** : le profil de vitesse donne le point de freinage exact (la passe arrière). La question humaine
   (trouver le point sans le calcul) ne se pose qu'à Sami, au J4. Un **repère visuel** sur la vue de face (un panneau
   à 100 m) l'aiderait : idée pour P9.

2. **Le freinage dégressif** (*trail braking*) : est-ce la norme ?
   **Oui, sur les virages où l'on freine fort**, pas sur tous. L'explication est celle du cercle d'adhérence :
   freinage et virage puisent dans la même adhérence, donc on relâche le frein à mesure qu'on braque. Cela permet de
   freiner plus tard et de charger l'avant pour aider la voiture à tourner. Trop de frein en entrée fait survirer.
   C'est difficile à faire de façon régulière (Wikipédia, *Trail braking* ; Driver61 ; HP Academy).
   → **Pour nous** : un point matériel sous un cercle d'adhérence le fait **par construction**. Là où la vitesse
   limite du virage baisse, la passe arrière freine tant qu'il reste de l'adhérence après le virage. Le transfert de
   charge vers l'avant n'apparaît qu'avec le modèle bicyclette (J4). **Ouvert** : aucun article trouvé ne montre le
   freinage dégressif *émergeant* d'une commande optimale. Perantoni et Limebeer (2014) publient les commandes de
   frein, à lire de près. C'est aussi ce qui justifie la gâchette RT (§ 2, question 6).

3. **La ligne de pluie** : en quoi diffère-t-elle de la ligne sèche ?
   Les écoles s'accordent. **La trajectoire sèche devient la plus glissante** sous la pluie : le caoutchouc déposé et
   l'asphalte poli par les passages. Le pilote freine et braque hors de cette trajectoire. Il la croise seulement où il
   le faut, plus large à l'entrée et en ligne droite à la sortie, même si ce n'est pas la ligne la plus rapide sur le
   papier (Track Titan ; HP Academy ; Driver61 ; Ross Bentley). **Le mécanisme est discuté** : le caoutchouc pour la
   plupart, la rugosité de l'asphalte hors trajectoire pour un manuel de conduite (Nigel Greensall).
   → **Pour nous** : l'hypothèse d'avant est confirmée. Elle demande **un μ qui dépend de la position latérale** : plus
   bas sur une bande autour de la ligne sèche quand il pleut. C'est un modèle simple, et P8 peut le tester. La
   question devient : l'optimiseur retrouve-t-il seul la ligne de pluie des écoles ?

4. **Les virages enchaînés** : quand sacrifie-t-on un virage pour le suivant ?
   **Avant une longue ligne droite**, on entre plus lentement et on prend la corde plus tard, pour ouvrir la sortie
   et accélérer plus tôt : la vitesse gagnée à la sortie se garde sur toute la ligne droite. **Avant une ligne droite
   courte**, ou un autre virage, on garde plutôt la vitesse de corde (Driver61 ; Virtual Racing School). Ce sont des
   règles d'écoles, sans mesure. Le README de TU Munich dit la même chose de sa courbure minimale : elle n'exploite
   pas l'accélération en sortie de virage.
   → **Pour nous** : c'est **la prédiction de P2**. La ligne de CMA-ES, notée par le temps au tour, doit placer la
   corde plus tard que la courbure minimale devant les longues lignes droites, et pas devant les courtes. C'est
   mesurable, donc c'est le meilleur test du projet.

5. **Le réglage** : qu'est-ce qui change le plus le temps au tour ?
   Des simulations de temps au tour donnent des ordres de grandeur. **L'adhérence pèse le plus** : +10 % d'adhérence
   donnent environ −2 % de temps au tour, selon un modèle d'amateur sur un forum, sans source plus solide. **Appui et
   traînée s'échangent** : Canopy (un éditeur de simulation, qui vend son logiciel) mesure à Barcelone 0,022 s gagnés
   par point d'appui et 0,045 s perdus par point de traînée. Le rapport varie peu d'une piste à l'autre. L'appui ne
   sert à rien au milieu d'un virage limité par l'adhérence, et il sert beaucoup à la sortie. **Les rapports** se
   règlent par ligne droite (un article SAE, 2020-01-0543).
   → **Pour nous** : P11 a sa donnée, la F1 de TU Munich (§ 1, question 5), dont l'appui, la traînée et les rapports
   sont des paramètres. CMA-ES y ajoute ces gènes aux écarts. **Ouvert** : aucune étude solide, publiée par des pairs,
   ne classe ces réglages. Les chiffres ci-dessus sont des **hypothèses**.

6. **Les pneus qui chauffent et s'usent** : changent-ils la ligne au fil d'un relais ?
   **Oui, sur un relais.** Tremlett et Limebeer (*Optimal tyre usage for a Formula One car*, Vehicle System Dynamics,
   2016) mènent la commande optimale sur plusieurs tours avec un modèle thermique de pneu. De petits changements de
   conduite y réduisent nettement l'usure. Canopy borne l'énergie d'usure des pneus pendant l'optimisation, et
   l'équilibre de la voiture en change. Un article de 2024 sur les voitures électriques simule une baisse linéaire
   de l'adhérence, jusqu'à 90 % au bout d'un relais de 11 tours (arXiv 2412.15379).
   → **Pour nous** : **hors du projet** tant qu'on mesure un tour. Si un jour on le fait, la baisse linéaire du μ
   sur le relais est le modèle le plus simple, et il est publié.

## Sources du § 4

- Le freinage dégressif : Wikipédia, <https://en.wikipedia.org/wiki/Trail_braking> ; Driver61,
  <https://driver61.com/uni/trail-braking/> ; HP Academy,
  <https://hpacademy.com/courses/race-driving-fundamentals/trail-braking-trail-braking>
- La pluie : Track Titan, <https://www.tracktitan.io/post/why-you-should-avoid-the-racing-line-in-the-wet> ;
  HP Academy, <https://www.hpacademy.com/courses/race-driving-fundamentals/wet-vs-dry-lines-wet-vs-dry-lines/> ;
  Driver61, <https://driver61.com/uni/circuit-driving-in-the-rain/> ; Ross Bentley,
  <https://rossbentley.substack.com/p/speed-secrets-how-to-be-a-rain-meister> ; Nigel Greensall,
  <https://www.nigelgreensall.com/wp-content/uploads/2016/03/1_advanced-driver-training-ebook-ch9.pdf>
- Les virages enchaînés : Driver61, <https://driver61.com/uni/different-corner-technique/> ; Virtual Racing School,
  <https://virtualracingschool.com/academy/tag/best/>
- Le point de freinage : Blayze, <https://blayze.io/blog/5-reference-points-for-every-corner-on-the-race-track> ;
  Simracing Cockpit, <https://simracingcockpit.gg/how-to-learn-a-new-track-faster/>
- Le réglage : Canopy, <https://simulation.michelin.com/canopy/technical-articles/f1-goes-to-indy> et
  <https://simulation.michelin.com/canopy/technical-articles/showing-our-sensitive-side> ; le forum f1technical,
  <https://www.f1technical.net/forum/viewtopic.php?p=564563> ; SAE 2020-01-0543 (les rapports)
- Les pneus : Tremlett et Limebeer, <https://ui.adsabs.harvard.edu/abs/2016VSD....54.1448T> ; Canopy,
  <https://simulation.michelin.com/canopy/technical-articles/get-a-grip-on-tyre-saving> ;
  <https://arxiv.org/abs/2412.15379>
- La voiture : TU Munich, `laptime-simulation`,
  <https://github.com/TUMFTM/laptime-simulation/blob/master/laptimesim/input/vehicles/F1_Shanghai.ini>

## 5. Les décisions du J1 (Sami, 14/11)

Trois questions posées à la fin du J1 ([../modele.md](../modele.md)), chacune avec une recommandation. Sami : « Ok pour
les trois ».

1. **La demi-largeur de la voiture vaut 1 m**, celle d'une F1 de 2017 à 2025, sans marge de sécurité. Les lignes de
   TU Munich gardent 0,75 m du bord : la comparaison avec elles se fait à leur marge.
2. **Le modèle de la voiture reste le point matériel** : pas de rapports, pas de DRS, pas de transfert de charge tant
   qu'aucune question ne l'exige. Ces simplifications ne changent pas l'ordre des lignes sous un même modèle.
3. **Le J2 commence** : CMA-ES sur les écarts, noté par le temps au tour, contre l'escalade et la courbure minimale
   (P2 de [pistes.md](pistes.md)).
