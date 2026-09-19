#!/usr/bin/env bash

PROJECT_DIR="$HOME/projets/tetris"

cd "$PROJECT_DIR" || return 1

if [[ ! -f ".venv/bin/activate" ]]; then
    echo "Erreur : environnement virtuel introuvable."
    return 1
fi

source .venv/bin/activate

echo "✅ Projet Tetris activé"
echo "📁 $(pwd)"
echo "🚀 Lance Flask avec : python app.py"
