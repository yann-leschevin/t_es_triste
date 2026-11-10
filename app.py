"""T_es_triste — jeu de blocs dans le navigateur (Flask).

Le jeu tourne entièrement en JavaScript (static/t_es_triste.js). Flask sert la page
et garde les meilleurs scores (top 10) dans data/scores.json, comme scores.php
dans la version PHP en ligne :
    GET  /scores → {"ok": true, "scores": [...], "max": 10}
    POST /scores ← {"initiales": "ABC", "score": 1234, "lignes": 12, "niveau": 2}
Le score étant calculé dans le navigateur, un tricheur motivé peut envoyer un
faux score : les contrôles ci-dessous limitent seulement les abus.
"""
import fcntl
import hashlib
import json
import os
import re
import secrets
import time
from datetime import date
from pathlib import Path

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 2000  # un envoi de score est minuscule

SCORES_MAX = 10                # taille du classement
SCORE_LIMITE = 9_999_999       # au-delà : refusé
DELAI_ENTRE_ENVOIS = 10        # secondes, par adresse IP
FICHIER_SCORES = Path(__file__).resolve().parent / "data" / "scores.json"


@app.route("/")
def index():
    return render_template("index.html")


def repondre(donnees, code=200):
    reponse = jsonify(donnees)
    reponse.status_code = code
    reponse.headers["Cache-Control"] = "no-store"
    return reponse


def erreur(code, message):
    return repondre({"ok": False, "error": message}, code)


def lire(fichier):
    """Contenu du fichier ouvert (déjà verrouillé), avec les clés attendues."""
    fichier.seek(0)
    try:
        donnees = json.loads(fichier.read() or "{}")
    except ValueError:
        donnees = {}
    if not isinstance(donnees, dict):
        donnees = {}
    donnees.setdefault("scores", [])
    donnees.setdefault("envois", {})
    return donnees


def entier_positif(valeur):
    # bool est un int en Python : on le refuse explicitement
    return isinstance(valeur, int) and not isinstance(valeur, bool) and valeur >= 0


@app.route("/scores", methods=["GET", "POST"])
def scores():
    if request.method == "GET":
        if not FICHIER_SCORES.is_file():
            return repondre({"ok": True, "scores": [], "max": SCORES_MAX})
        with open(FICHIER_SCORES, encoding="utf-8") as f:
            fcntl.flock(f, fcntl.LOCK_SH)
            donnees = lire(f)
        return repondre({"ok": True, "scores": donnees["scores"], "max": SCORES_MAX})

    # ---- Lecture et contrôle de l'envoi ----
    corps = request.get_json(silent=True, force=True)
    if not isinstance(corps, dict):
        return erreur(400, "Données invalides.")
    initiales = corps.get("initiales")
    if not isinstance(initiales, str) or not re.fullmatch(r"[A-Z]{3}", initiales):
        return erreur(400, "Les initiales doivent être 3 lettres majuscules (A à Z).")
    for champ in ("score", "lignes", "niveau"):
        if not entier_positif(corps.get(champ)):
            return erreur(400, f"Valeur « {champ} » invalide.")
    score, lignes, niveau = corps["score"], corps["lignes"], corps["niveau"]
    if score < 1 or score > SCORE_LIMITE or lignes > 100_000 or niveau < 1 or niveau > 1000:
        return erreur(400, "Score invalide.")

    FICHIER_SCORES.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(FICHIER_SCORES, os.O_RDWR | os.O_CREAT, 0o644)
    with os.fdopen(fd, "r+", encoding="utf-8") as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        donnees = lire(f)

        # Limite d'envois : une empreinte de l'IP (jamais l'IP en clair), oubliée après le délai.
        maintenant = int(time.time())
        empreinte = hashlib.sha256(
            ((request.remote_addr or "") + str(FICHIER_SCORES)).encode()
        ).hexdigest()[:16]
        donnees["envois"] = {
            k: t for k, t in donnees["envois"].items() if maintenant - t < DELAI_ENTRE_ENVOIS
        }
        if empreinte in donnees["envois"]:
            return erreur(429, "Patiente quelques secondes avant d'enregistrer un nouveau score.")
        donnees["envois"][empreinte] = maintenant

        # ---- Insertion et classement ----
        nouveau = {
            "initiales": initiales,
            "score": score,
            "lignes": lignes,
            "niveau": niveau,
            "date": date.today().isoformat(),
            "id": secrets.token_hex(4),
        }
        # sorted est stable : à égalité, le plus ancien reste devant
        classement = sorted(donnees["scores"] + [nouveau], key=lambda s: s["score"], reverse=True)
        classement = classement[:SCORES_MAX]
        donnees["scores"] = classement
        rang = next((i + 1 for i, s in enumerate(classement) if s["id"] == nouveau["id"]), None)

        f.seek(0)
        f.truncate()
        json.dump(donnees, f, ensure_ascii=False, indent=4)
        f.flush()

    return repondre({"ok": True, "rang": rang, "id": nouveau["id"], "scores": classement, "max": SCORES_MAX})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=True)
