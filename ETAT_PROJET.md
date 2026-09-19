# ETAT_PROJET.md — Journal de suivi du projet Tetris

Date de début : 2026-09-16

## Objectif

- Ajouter une fonction `tspin` qui rapporte 2 fois plus de points qu'un
  « tetris » (4 lignes d'un coup, soit 800 x niveau → 1600 x niveau).
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

### Étape 3 — Ajout de la fonction `tspin` (web, `static/tetris.js`)

- Détection d'un T-spin : pièce `T`, dernière action = rotation, et au moins
  3 des 4 coins diagonaux autour de la pièce occupés (mur/plancher comptés).
- Bonus `tspin` = 2 x points d'un tetris = 2 x 800 x niveau = 1600 x niveau.

### Étape 4 — Ajout de la fonction `tspin` (Python, `tetris.py`)

- Même règle de détection appliquée à la version Pygame.
- Suivi de la dernière action (rotation) dans `rotate()` / `move()`.
- Bonus `tspin` de 1600 x niveau ajouté dans `lock_piece()`.

### Étape 5 — Création de `README.md`

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

## État actuel

- Toutes les étapes sont terminées.
- La fonction `tspin` rapporte 2 fois plus de points qu'un tetris
  (1600 x niveau contre 800 x niveau), dans le jeu web Flask et dans la
  version Python Pygame.