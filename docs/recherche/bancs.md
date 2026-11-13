# Les bancs : sur quelles pistes mesurer

Recherché le 13/11/2026. Une mesure se fait sur des pistes fixes, et toutes les variantes roulent les mêmes.

## 1. La base de pistes de TU Munich (`racetrack-database`)

- **Le contenu** : un peu plus de vingt circuits du monde, surtout de F1 et de DTM, avec leur ligne centrale, leurs
  largeurs et une ligne de course.
- **Le format** : des CSV. Les pistes ont pour colonnes `x_m, y_m, w_tr_right_m, w_tr_left_m` (la ligne centrale et
  les largeurs à droite et à gauche, en mètres). Les lignes de course n'ont que `x_m, y_m`.
- **Les lignes de course** ont été calculées par leur optimisation à courbure minimale. C'est donc une référence
  toute faite pour vérifier notre propre courbure minimale.
- **Deux réserves** (leur README) : les lignes centrales ont été lissées, donc elles ne sont plus exactement au
  milieu de la piste ; les largeurs ont été extraites d'images satellite par traitement d'image, et non relevées.
- **La licence** : LGPL-3.0 d'après un agrégateur (ecosyste.ms). **À vérifier** sur le fichier LICENSE du dépôt avant
  d'en copier une piste dans le nôtre. En attendant, **hypothèse** : un script les télécharge dans un dossier ignoré
  par git, au lieu de les copier.

**Pour nous** : le banc principal. Il nous donne de vrais circuits à l'échelle, le format qu'on adopte, et une ligne
de référence.

## 2. F1TENTH

- **La revue** d'Evans et al. (2024) fournit des résultats de référence et un logiciel open source
  (`f1tenth_benchmarks`) : des méthodes classiques (optimisation de trajectoire puis suivi, MPCC, *follow the gap*)
  et de l'apprentissage par renforcement de bout en bout.
- **Ce qu'elle mesure** : pour les méthodes classiques, l'effet de la fréquence de commande et de la précision de
  localisation ; pour l'apprentissage, celui de la récompense et de la carte d'entraînement.
- **Pas de jeu de pistes standard** : nous n'en avons pas trouvé de nommé, ni de classement. Les cartes sont dans le
  dépôt du banc, **à regarder** si on veut des petites pistes à l'échelle 1/10.

**Pour nous** : surtout utile en J4, pour le pilote, et pour sa liste de méthodes classiques.

## 3. TORCS

Un simulateur de course open source, utilisé par Cardamone et al. (2010) et par Vrajitoru pour la ligne de course
par algorithme génétique ([ligne-ideale.md](ligne-ideale.md) § 7). **Pour nous** : une source d'articles, pas un
banc. C'est un programme C++ complet, et nous gardons notre propre simulation en JavaScript.

## 4. Nos pistes à nous, tirées par graine

**Hypothèse de J1**, à valider au premier commit de code :

- **Une piste générée** : quelques points tirés au hasard autour d'un cercle (rayon et angle bruités), reliés par
  une spline fermée, avec une largeur constante ou bruitée. Il faut vérifier que la piste ne se recoupe pas.
- **L'intérêt** : autant de pistes qu'on veut, toutes rejouables par leur graine. On évite ainsi d'optimiser pour un
  seul circuit, et la course aux configurations a ses graines.
- **Des pistes de test faites à la main** : un ovale, une épingle, une chicane, un S. Ce sont les cas d'école où l'on
  sait à quoi la bonne ligne doit ressembler (extérieur, corde, extérieur).
- **Le kart** : des pistes courtes et sinueuses, à basse vitesse. **À chercher** : une source publique de tracés de
  karting (aucune trouvée à ce jour).

## 5. Ce qu'on mesure

- **Le temps au tour** sous un même modèle de voiture et de profil de vitesse. C'est la seule note qui compte. La
  longueur et la courbure ne sont que des indicateurs.
- **L'écart à la référence** : notre temps rapporté à celui de la ligne à courbure minimale, sur la même piste, avec
  le même profil.
- **Le coût** : le nombre de lignes notées et le temps de calcul, pour comparer les méthodes à budget égal.
- **Sur les pistes tirées par graine**, les comparaisons se font par paires, sur les mêmes graines, avec un
  intervalle (`measure` de la lib).

## Sources

- TUMFTM, `racetrack-database` : <https://github.com/TUMFTM/racetrack-database>
- Fiche de l'agrégateur (licence) : <https://awesome.ecosyste.ms/projects/63690>
- Evans et al., revue et banc F1TENTH : <https://arxiv.org/abs/2402.18558>
- Cardamone et al., TORCS : voir [ligne-ideale.md](ligne-ideale.md).
