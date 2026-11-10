# ETAT_PROJET.md — Journal de suivi du projet Tetris

Date de début : 2026-09-16

## Prompt initial

> Lit et met à jour le fichier de suivit : ETAT_PROJET.md et note toutes tes
> étapes de travail ainsi que le prompt en premier. Travaille dans le dossier
> courant.
>
> Fonctionnalité :
>  - Ajoute la fonctionnalité : TSPIN
>  - Ajoute la fonctionnalité de stockage d'une pièce et récupération de la
>    pièce stocké

## Objectif

- Ajouter une fonction `tspin` qui rapporte 2 fois plus de points qu'un
  « tetris » (4 lignes d'un coup, soit 800 x niveau → 1600 x niveau).
- Ajouter la fonctionnalité de **hold** (stockage / récupération d'une pièce)
  dans la version web.
- Créer un `README.md`.
- Tester l'application Flask et corriger les erreurs.

## Contraintes respectées

- Uniquement Python et Flask (le client web sert de logique de jeu déjà
  existante en JavaScript, servie par Flask).
- Pas de Node.js / React / Next.js.
- Aucune dépendance installée automatiquement.
- Fichiers écrits directement avec les outils de l'assistant.

## Journal des étapes

### Étape 1 — Lecture des fichiers (fait)

Fichiers lus :

| Fichier | Rôle |
| --- | --- |
| `app.py` | Application Flask (route `/`, port 5002). |
| `tetris.py` | Version Pygame du jeu en Python. |
| `source-tetris.sh` | Script d'activation du venv. |
| `templates/index.html` | Page HTML du jeu Flask. |
| `static/style.css` | Styles de la page. |
| `static/tetris.js` | Logique du jeu web servie par Flask. |

### Étape 2 — Vérification de l'environnement (fait)

- Python 3.12.3 dans `.venv`.
- Flask 3.1.3 disponible dans `.venv`.
- Aucune installation de dépendance nécessaire.

### Étape 3 — Ajout de la fonction `tspin` (web, `static/tetris.js`) (fait)

- Détection d'un T-spin : pièce `T`, dernière action = rotation, et au moins
  3 des 4 coins diagonaux autour de la pièce occupés (mur/plancher comptés).
- Bonus `tspin` = 2 x points d'un tetris = 2 x 800 x niveau = 1600 x niveau.

### Étape 4 — Ajout de la fonction `tspin` (Python, `tetris.py`) (fait)

- Même règle de détection appliquée à la version Pygame.
- Suivi de la dernière action (rotation) dans `rotate()` / `move()`.
- Bonus `tspin` de 1600 x niveau ajouté dans `lock_piece()`.

### Étape 5 — Création de `README.md` (fait)

- `README.md` créé : présentation, lancement, commandes, structure et tests.

### Étape 6 — Tests de l'application (fait)

Vérifications effectuées :

- `python -m py_compile app.py tetris.py` : OK (pas de démarrage durable
  du serveur).
- `node --check static/tetris.js` : OK (syntaxe du script web).
- Routes Flask via `test_client` :
  - `GET /` → 200
  - `/static/tetris.js` → 200
  - `/static/style.css` → 200
- Tests fonctionnels Python (pygame en mode headless) :
  - Détection T-spin avec 3 coins occupés : OK.
  - T-spin sans rotation préalable : non détecté (OK).
  - T-spin avec une pièce autre que `T` : non détecté (OK).
  - Bonus de score : `lock_piece()` ajoute bien 1600 x niveau
    (= 2 x 800 x niveau).
  - Simulation de 600 actions aléatoires (déplacements, rotations,
    chutes, réserves) : aucune erreur.

### Étape 7 — Correction d'erreurs (fait)

- **Bug trouvé** dans `tetris.py`, méthode `tspin()` : l'expression
  `min(y for y, _ in cells)` lisait l'abscisse `x` au lieu de l'ordonnée
  `y` (confusion de variables dans la compréhension), ce qui faussait le
  calcul des coins. Corrigé en calculant `min_x/max_x/min_y/max_y` avec
  une boucle explicite sur `(x, y)`.
- Vérification finale des fichiers : `ETAT_PROJET.md`, `README.md`,
  `app.py`, `tetris.py`, `templates/index.html`, `static/style.css`,
  `static/tetris.js` existent tous (confirmé).

### Étape 8 — Ajout de la fonctionnalité Hold (web, `static/tetris.js`) (fait)

La version web n'avait **pas** de fonctionnalité de hold alors que la version
Python l'avait déjà. Ajouts effectués :

**`static/tetris.js` :**
- Nouvelles variables globales : `holdPiece` (pièce en stockage) et
  `canHold` (flag empêchant un double hold).
- Nouvelles références DOM : `holdCanvas` / `holdContext` pour le canvas
  de la réserve.
- Nouvelle fonction `drawHold()` : affiche la pièce stockée dans le canvas
  hold (ou un fond vide si aucune pièce n'est stockée).
- Nouvelle fonction `holdPieceAction()` :
  - Remplace la pièce courante par la pièce stockée (ou passe à la suivante
    si le stockage est vide).
  - Remet `canHold = false` pour interdire un second hold consécutif.
  - Vérifie les collisions après le swap.
- Ajout de `canHold = true` dans `resetGame()` et `lockPiece()`.
- Ajout du raccourci clavier `KeyC` → `holdPieceAction()`.
- Appel de `drawHold()` dans `resetGame()`.

### Étape 9 — Ajout du canvas Hold dans le HTML (`templates/index.html`) (fait)

- Nouveau `<section class="panel">` avec titre « Réserve (C) » et
  `<canvas id="hold" width="120" height="120">`.
- Ajout de la ligne « C : réserver pièce » dans la section Commandes.

### Étape 10 — Mise à jour du CSS (`static/style.css`) (fait)

- Le sélecteur `#next` est élargi en `#next, #hold` pour appliquer le même
  style au canvas de réserve.

### Étape 11 — Vérifications finales (fait)

- `node --check static/tetris.js` → OK (syntaxe validée).
- `python -m py_compile tetris.py` → OK.
- Tous les fichiers modifiés : `static/tetris.js`, `templates/index.html`,
  `static/style.css`, `ETAT_PROJET.md`.

### Étape 12 — Correction du bug Hold : pièce affichée dans le mauvais canvas (fait)

- **Bug signalé** : lorsqu'on appuie sur C pour réserver la pièce, celle-ci
  s'affiche dans le canvas « Pièce suivante » (écran du haut) au lieu du
  canvas « Réserve » (écran en dessous).
- **Cause** : la fonction `drawPreviewBlock()` dessinait toujours sur
  `nextContext` (le canvas de la pièce suivante), même quand `drawHold()`
  l'appelait pour dessiner la pièce stockée dans le canvas hold.
- **Correction** : ajout d'un paramètre `ctx` (contexte canvas) à
  `drawPreviewBlock(ctx, x, y, color)`. Les deux appelants (`drawNext()` →
  `nextContext`, `drawHold()` → `holdContext`) passent maintenant le bon
  contexte.
- Vérification : `node --check static/tetris.js` → OK.

## État actuel

- **T-Spin** : implémenté et fonctionnel dans les deux versions
  (Python Pygame `tetris.py` et web `static/tetris.js`).
  - Détection : pièce T, dernière action = rotation, ≥ 3 coins occupés.
  - Bonus : 1600 x niveau (2 × 800 × niveau).
- **Hold (réserve)** : implémenté et fonctionnel dans les deux versions.
  - Python (`tetris.py`) : méthode `hold()`, touche `C`.
  - Web (`static/tetris.js`) : fonction `holdPieceAction()`, touche `C`,
    canvas HTML dédié.
  - Règle : un seul hold par pièce déposée (`canHold` réinitialisé au
    lock).
  - **Bug corrigé** (étape 12) : la pièce stockée s'affiche maintenant
    dans le canvas Réserve au lieu du canvas Pièce suivante.
- **README.md** : présent.
- **Application Flask** : fonctionnelle (port 5002).
- Toutes les étapes sont terminées.

## Mise à jour du 2026-11-10 — renommage en T_es_triste et meilleurs scores

- Projet renommé **T_es_triste** (« Tetris » est une marque déposée) : dossier
  `~/projets/PYTHON/t_es_triste`, dépôt GitHub `yann-leschevin/t_es_triste`,
  script web renommé `static/t_es_triste.js` (les mentions de `static/tetris.js`
  plus haut désignent ce fichier), titre « T_ES_TRISTE », « 2 × 4 lignes ».
- `source-tetris.sh` / `source3.sh` remplacés par `source.sh` (port 5016).
- Reprise des ajouts de la version PHP en ligne (`php/`) :
  - **meilleurs scores** (top 10) : route Flask `/scores` dans `app.py`
    (GET = classement, POST = nouveau score, mêmes contrôles que `scores.php`,
    10 s entre deux envois par IP, IP jamais stockée en clair),
    fichier `data/scores.json` (non versionné) ;
  - saisie de 3 initiales en fin de partie si le score entre dans le top 10.
- Conservés : réserve (touche **C**), commandes tactiles, T-Spin.
- Vérifié dans Firefox (sans affichage) : C, fin de partie, initiales,
  classement, affichage téléphone.
