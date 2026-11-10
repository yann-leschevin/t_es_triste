# T_es_triste

> 🌐 **Essayer en ligne : <https://leschevin.com/projets/t_es_triste/>**
>
> 🤝 **Version PHP et mise en ligne réalisées par Yann Leschevin ([@yann-leschevin](https://github.com/yann-leschevin)) en collaboration avec Claude (Anthropic), via [Claude Code](https://claude.com/claude-code)** — novembre 2026.

Jeu de blocs qui tombent, jouable au clavier dans le navigateur (anciennement « tetris-flask », renommé : « Tetris » est une marque déposée).

Ce dépôt contient **deux versions** du projet :

| Partie | Dossier | Rôle | Lancer en local |
|--------|---------|------|-----------------|
| 🐍 **Python** (Flask) | racine du dépôt | version complète (avec réserve **C**), à lancer sur son ordinateur | `source source.sh` puis http://localhost:5016 |
| 🐘 **PHP** | [`php/`](php/) | version publiée sur [leschevin.com](https://leschevin.com/projets/t_es_triste/) (hébergement OVH) | `cd php && php -S 127.0.0.1:8080 -t www` |

---

## 🐘 Partie PHP — version en ligne

👉 <https://leschevin.com/projets/t_es_triste/> · documentation détaillée : [`php/README.md`](php/README.md)

- `index.php` sert le jeu (JavaScript, canvas) ;
- **meilleurs scores** : top 10 enregistré par `scores.php` dans `php/www/data/scores.json`
  (fichier jamais versionné ni écrasé lors d'un envoi), saisie de 3 initiales en majuscules en fin de partie ;
- textes du jeu renommés (T_ES_TRISTE, « 2 × 4 lignes »).

Tests : `bash php/tests/test.sh`.

Le dossier `php/www/` est exactement ce qui est envoyé sur l'hébergement (dans `www/projets/t_es_triste/`).

---

## 🐍 Partie Python — version Flask (à lancer sur son ordinateur)

Le jeu web est servi par Flask ; le projet contient aussi une version autonome en Pygame (`tetris.py`).
Elle a tout ce qu'a la version en ligne, **plus** la réserve et les commandes tactiles :

- **réserve** : touche **C** (ou bouton « Réserve » / lancer vers le haut sur écran tactile) pour mettre
  la pièce de côté et la reprendre plus tard (une fois par pièce posée) ;
- **meilleurs scores** : top 10 gardé par la route Flask `/scores` dans `data/scores.json`
  (non versionné), saisie de 3 initiales en fin de partie ;
- **commandes tactiles** (téléphone / tablette) : boutons et gestes sur la grille ;
- **T-Spin** : 2 × 4 lignes, soit 1600 × niveau.

### Lancer l'application

```bash
source source.sh      # crée le .venv si besoin, installe Flask et lance le serveur
```

Ouvrir ensuite <http://localhost:5016>. (Sans le script : `python3 app.py`, port 5002.)

### Version Pygame

```bash
source .venv/bin/activate
python tetris.py
```

### Fonctionnalité « T-Spin »

Un T-Spin est un placement de la pièce `T` réalisé en la faisant tourner dans
un espace étroit, avec au moins 3 des 4 coins diagonaux autour de la pièce
occupés (murs et plancher inclus).

- Analyse : pièce `T` + dernière action de rotation + ≥ 3 coins occupés.
- Bonus : **2 fois plus de points que 4 lignes d'un coup**.
  - 4 lignes : 800 × niveau
  - T-Spin : **1600 × niveau**

La détection est implémentée dans `static/t_es_triste.js` (fonction `tspin`) et `tetris.py` (méthode `tspin`).

### Commandes (jeu web)

| Touche | Action |
| --- | --- |
| ← / → | Déplacer |
| ↓ | Accélérer |
| ↑ / X | Rotation |
| Z | Rotation inverse |
| Espace | Chute directe |
| C | Réserver la pièce / reprendre la pièce réservée |
| P | Pause |
| R | Recommencer |

Sur écran tactile : toucher la grille = rotation, glisser ← → = déplacer, glisser ↓ = accélérer,
lancer ↓ = chute directe, lancer ↑ = réserve.

### Structure du projet

```
app.py                     Application Flask (page + route /scores)
tetris.py                  Version Pygame du jeu
source.sh                  Crée le venv, installe Flask, lance le serveur (port 5016)
templates/index.html       Page HTML du jeu web
static/style.css           Styles (ordinateur, téléphone, tablette)
static/t_es_triste.js      Logique du jeu web (T-Spin, réserve, scores, tactile)
data/scores.json           Meilleurs scores (créé automatiquement, non versionné)
ETAT_PROJET.md             Journal de suivi du développement
php/                       Version PHP en ligne
```

### Tests

```bash
python -m py_compile app.py tetris.py
node --check static/t_es_triste.js
python -c "import app; c = app.app.test_client(); print(c.get('/').status_code, c.get('/scores').json)"
```
