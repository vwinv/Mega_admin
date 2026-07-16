#!/bin/bash
# Double-clique ce fichier dans le Finder pour demarrer Mega SWA.
# Si l'appli tourne deja, ouvre simplement le navigateur.

set -u

# Resout les raccourcis / liens (ex. icone sur le Bureau)
SOURCE="${BASH_SOURCE[0]:-$0}"
while [[ -L "$SOURCE" ]]; do
  DIR="$(cd "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ "$SOURCE" != /* ]] && SOURCE="$DIR/$SOURCE"
done
ROOT="$(cd "$(dirname "$SOURCE")" && pwd)"
URL="http://localhost:3000"
PORT=3000

cd "$ROOT" || {
  echo "Impossible d'ouvrir le dossier du projet :"
  echo "  $ROOT"
  read -r -p "Appuie sur Entree pour fermer..."
  exit 1
}

clear
echo "========================================"
echo "   Mega SWA — demarrage local"
echo "========================================"
echo ""
echo "Dossier : $ROOT"
echo ""

port_up() {
  lsof -tiTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1
}

if port_up; then
  echo "L'appli tourne deja sur $URL"
else
  echo "L'appli est eteinte — demarrage en cours..."
  echo ""
  if [[ ! -x "$ROOT/scripts/dev-server.sh" ]]; then
    chmod +x "$ROOT/scripts/dev-server.sh" 2>/dev/null || true
  fi

  if ! "$ROOT/scripts/dev-server.sh" watch; then
    echo ""
    echo "Echec du demarrage. Verifie les logs :"
    echo "  $ROOT/.dev-server.log"
    read -r -p "Appuie sur Entree pour fermer..."
    exit 1
  fi

  # Attendre que le port reponde
  echo ""
  echo "Attente du serveur..."
  for _ in $(seq 1 60); do
    if port_up; then
      break
    fi
    sleep 0.5
  done

  if ! port_up; then
    echo "Le serveur n'a pas demarre a temps."
    echo "Logs : $ROOT/.dev-server.log"
    read -r -p "Appuie sur Entree pour fermer..."
    exit 1
  fi
  echo "Serveur pret."
fi

echo ""
echo "Ouverture de $URL ..."
open "$URL"

echo ""
"$ROOT/scripts/dev-server.sh" status 2>/dev/null || true
echo ""
echo "Tu peux fermer cette fenetre — l'appli continue en arriere-plan."
echo "Pour arreter : double-clique \"Arreter Mega SWA.command\""
echo "  ou dans un terminal : npm run local:stop"
echo ""
read -r -p "Appuie sur Entree pour fermer..."
