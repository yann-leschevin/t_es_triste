# T_es_triste

> 🌐 **Essayer en ligne : <https://leschevin.com/projets/t_es_triste/>**
>
> 🤝 **Version PHP et mise en ligne réalisées par Yann Leschevin ([@yann-leschevin](https://github.com/yann-leschevin)) en collaboration avec Claude (Anthropic), via [Claude Code](https://claude.com/claude-code)** — novembre 2026.

Jeu de blocs qui tombent, jouable au clavier dans le navigateur (anciennement « tetris-flask », renommé : « Tetris » est une marque déposée).

Ce dépôt contient **deux versions** du projet :

| Partie | Dossier | Rôle | Lancer en local |
|--------|---------|------|-----------------|
| 🐍 **Python** (Flask) | racine du dépôt | version d'origine, à lancer sur son ordinateur | `source source-tetris.sh` (ou `python3 app.py`) puis http://localhost:5002 |
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

## 🐍 Partie Python — version d'origine

Le code Python n'a pas été modifié par le portage : il reste à la racine du dépôt.
Sa documentation d'origine suit.

### Tetris Flask

Un Tetris jouable dans le navigateur, servi par Flask (Python). Le projet
contient aussi une version autonome en Pygame (`tetris.py`).

#### Prérequis

- Python 3
- Flask (déjà installé dans `.venv`)

#### Lancer l'application

```bash
source source-tetris.sh
python app.py
```

Ouvrir ensuite <http://localhost:5002>.

#### Version Pygame

```bash
source .venv/bin/activate
python tetris.py
```

#### Fonctionnalité « T-Spin »

Un T-Spin est un placement de la pièce `T` réalisé en la faisant tourner dans
un espace étroit, avec au moins 3 des 4 coins diagonaux autour de la pièce
occupés (murs et plancher inclus).

- Analyse : pièce `T` + dernière action de rotation + ≥ 3 coins occupés.
- Bonus : **2 fois plus de points qu'un Tetris** (4 lignes d'un coup).
  - Tetris : 800 × niveau
  - T-Spin : **1600 × niveau**

La détection est implémentée dans :
- `static/tetris.js` (fonction `tspin`, jeu web servi par Flask) ;
- `tetris.py` (méthode `tspin`, version Pygame).

#### Commandes (jeu web)

| Touche | Action |
| --- | --- |
| ← / → | Déplacer |
| ↓ | Accélérer |
| ↑ / X | Rotation |
| Z | Rotation inverse |
| Espace | Chute directe |
| P | Pause |
| R | Recommencer |

#### Structure du projet

```
app.py                  Application Flask (route /, port 5002)
tetris.py               Version Pygame du jeu
templates/index.html    Page HTML du jeu web
static/style.css        Styles
static/tetris.js        Logique du jeu web (fonction tspin incluse)
ETAT_PROJET.md          Journal de suivi du développement
```

#### Tests

Vérification de la syntaxe Python (sans démarrer le serveur) :

```bash
python -m py_compile app.py tetris.py
```

Test de la route Flask :

```bash
python -c "import app; c = app.app.test_client(); r = c.get('/'); print(r.status_code)"
```
