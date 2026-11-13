# Les questions pour Sami

Sami est le « professionnel » de ce projet : il a longtemps joué à Trackmania. Chaque question a une hypothèse, qui
tient en attendant sa réponse. Rédigé le 13/11/2026.

## Le jeu

1. **Quel Trackmania as-tu le plus joué ?** Nations Forever, United, TM2, Trackmania 2020 ? Les sources de
   [trackmania.md](trackmania.md) portent surtout sur Nations Forever.
   *Hypothèse* : Nations Forever et 2020, et leur voiture *Stadium*.
2. **Qu'est-ce qui fait une bonne ligne pour toi, en jeu ?** La corde tardive, le dérapage, couper l'herbe ? Ce que
   tu sens est ce que P2 doit retrouver seul.
   *Hypothèse* : extérieur, corde, extérieur, et la corde plus tard avant une ligne droite.
3. **Le dérapage compte-t-il ?** Dans Trackmania, on passe certains virages en glissant. Il faut un modèle de pneu qui
   sature (J4).
   *Hypothèse* : oui, mais après une première voiture qui accroche.
4. **Les surfaces** : la glace, la terre, l'herbe font-elles partie du plaisir, ou de la difficulté qu'on veut
   modéliser ?
   *Hypothèse* : oui, en J5, comme un μ par portion de piste.
5. **Le kart** : as-tu roulé en kart, et as-tu des tracés en tête ?
   *Hypothèse* : non ; les pistes viendront de la base de TU Munich et de nos tirages.

## Les commandes

6. **Clavier ou manette ?** Au clavier, la direction est tout ou rien ; à la manette, elle est analogique.
   *Hypothèse* : le clavier d'abord, la manette ensuite si elle sert, comme pour raquette.
7. **Le fantôme** : veux-tu courir contre la ligne idéale (un fantôme), contre un pilote robot, ou les deux ?
   *Hypothèse* : le fantôme d'abord (J3), le robot ensuite (J4).

## Les décisions de projet

8. **Le solveur QP dans la lib** : la courbure minimale (P1, P4) et `reseau` (le DC-OPF) en ont besoin. On l'écrit
   dans `mcts-commun`, avec ses tests et son banc, plutôt que deux fois dans deux projets ?
   *Recommandation* : oui, dans la lib, quand P4 arrive. P1 s'en passe avec une descente projetée.
9. **La base de pistes de TU Munich** : sa licence (LGPL-3.0 d'après un agrégateur) est à vérifier. On la télécharge
   par un script, dans un dossier ignoré par git, plutôt que de la copier ?
   *Recommandation* : oui, le script ; jamais de copie tant que la licence n'est pas lue.
10. **Pas de branchement sur Trackmania** : ni greffon, ni TMInterface, ni automatisation du jeu. Il reste une
    source d'idées.
    *Recommandation* : oui. Le jeu est fermé, et une IA branchée dessus est un autre projet, très coûteux (Linesight).
