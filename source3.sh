#!/bin/bash

PROJECT_DIR="$(pwd)"

cd "$PROJECT_DIR" || exit 1

# Création de l'environnement virtuel si nécessaire
if [ ! -d ".venv" ]; then
    echo "❌ Environnement virtuel introuvable."
    echo "👉 Création de l'environnement virtuel..."
    python3 -m venv .venv || exit 1
fi

# Activation du venv
source .venv/bin/activate

echo "✅ Projet HWMonitor V2"
echo "📁 $(pwd)"
echo "🐍 Python : $(which python)"

# Test de Flask
if python -c "import flask" 2>/dev/null; then
    FLASK_VERSION=$(python -c "import flask; print(flask.__version__)" 2>/dev/null)
    echo "🌐 Flask : installé (version $FLASK_VERSION)"
else
    echo "❌ Flask n'est pas installé dans le .venv."
    echo "👉 Installation de Flask..."
    
    python -m pip install flask || {
        echo "❌ Échec de l'installation de Flask."
        exit 1
    }

    FLASK_VERSION=$(python -c "import flask; print(flask.__version__)" 2>/dev/null)
    echo "✅ Flask installé (version $FLASK_VERSION)"
fi

echo "🚀 Lance Flask avec : python app.py"
echo

python app.py
