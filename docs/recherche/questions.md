# Les questions pour Sami, et pour un professionnel

Rédigé le 13/11/2026. Sami a répondu le jour même ; ses réponses sont citées telles quelles, suivies de ce que le
projet en tire. Il a fait une remarque juste sur le titre :

> « Pour moi un vrais professionnel serai plus qqun du milieu des course automobile, mécanicien/pilote. »

Sami est donc **le joueur**. Il sait ce qu'est une bonne ligne dans Trackmania et ce qu'est une bonne prise en main.
**Le professionnel**, un pilote ou un mécanicien de course, reste à trouver. Ses questions sont au § 4, avec une
hypothèse en attendant.

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
   → **Décision** : des circuits de F1 et Le Mans. **Les données** :
   - **les pistes** : oui, la base de TU Munich a une vingtaine de circuits de F1 et de DTM ([bancs.md](bancs.md)).
     **À vérifier au J1** : si le circuit de la Sarthe (Le Mans) y figure. Sinon, il faudra une autre source ;
   - **les voitures** : les articles de commande optimale publient des modèles de F1 (Perantoni et Limebeer, 2014),
     et TU Munich a un dépôt de simulation de temps au tour (`laptime-simulation`) avec des paramètres de véhicule.
     **À lire au J1** : ce qu'ils contiennent exactement, et sous quelle licence. En attendant, **hypothèse** : un
     point matériel avec μ ≈ 1,5 à 2 pour une F1 (l'appui aérodynamique le fait monter avec la vitesse). C'est un
     ordre de grandeur, pas une source.

## 2. Les commandes et l'écran

6. **Clavier ou manette ?**
   Sami : « les deux, un peut de lag à la manette, mais plus agréable long terme. accélérer fléche-haut/A, frein
   Ctrl-gauche/RB, et gauche/droite via pad-gauche ou fléches ».
   → **Décision** : les deux, dès J4.

   | Action | Clavier | Manette |
   |---|---|---|
   | accélérer | flèche haut | A |
   | freiner | Ctrl gauche | RB |
   | tourner | flèches gauche / droite | stick gauche (analogique) |

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

Personne n'est encore trouvé. Chaque question a une hypothèse, qui tient en attendant.

1. **Le point de freinage** : comment le choisit-on sur un circuit inconnu, et que corrige-t-on d'un tour à l'autre ?
   *Hypothèse* : le profil de vitesse le donne (la passe arrière) ; le pilote l'affine par repères visuels.
2. **Le freinage dégressif** (*trail braking*) : freiner en entrant dans le virage, est-ce la norme ?
   *Hypothèse* : oui, et c'est ce que le cercle d'adhérence autorise : on partage l'adhérence entre le freinage et
   le virage.
3. **La ligne de pluie** : en quoi diffère-t-elle de la ligne sèche ?
   *Hypothèse* : on évite la trajectoire habituelle, plus glissante sous la pluie (le caoutchouc déposé), et l'on
   cherche l'adhérence ailleurs. **À sourcer.**
4. **Les virages enchaînés** : quand sacrifie-t-on un virage pour le suivant ?
   *Hypothèse* : avant une longue ligne droite, toujours : la vitesse de sortie compte plus que le temps du virage.
   C'est ce que P2 doit retrouver seul.
5. **Le réglage** : qu'est-ce qui change le plus le temps au tour, entre l'appui aérodynamique, les rapports et les
   pneus ?
   *Hypothèse* : l'appui, sur un circuit lent ; les rapports, sur un circuit rapide (Le Mans). **À sourcer**
   (Perantoni et Limebeer optimisent le réglage avec la ligne, P11).
6. **Les pneus qui chauffent et s'usent** : à quel point changent-ils la ligne au fil d'un relais ?
   *Hypothèse* : hors du projet tant qu'on mesure un seul tour.
