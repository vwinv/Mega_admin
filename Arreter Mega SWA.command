#!/bin/bash
# Double-clique ce fichier pour arreter Mega SWA (serveur local + watchdog).

set -u

SOURCE="${BASH_SOURCE[0]:-$0}"
while [[ -L "$SOURCE" ]]; do
  DIR="$(cd "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  [[ "$SOURCE" != /* ]] && SOURCE="$DIR/$SOURCE"
done
ROOT="$(cd "$(dirname "$SOURCE")" && pwd)"

cd "$ROOT" || {
  echo "Impossible d'ouvrir le dossier du projet :"
  echo "  $ROOT"
  read -r -p "Appuie sur Entree pour fermer..."
  exit 1
}

clear
echo "========================================"
echo "   Mega SWA — arret local"
echo "========================================"
echo ""

if [[ ! -x "$ROOT/scripts/dev-server.sh" ]]; then
  chmod +x "$ROOT/scripts/dev-server.sh" 2>/dev/null || true
fi

"$ROOT/scripts/dev-server.sh" stop
echo ""
read -r -p "Appuie sur Entree pour fermer..."
