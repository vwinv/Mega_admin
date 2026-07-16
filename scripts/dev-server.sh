#!/usr/bin/env bash
# Gestion du serveur de developpement Mega SWA
# Usage:
#   ./scripts/dev-server.sh start|stop|restart|status|watch|logs|foreground

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="${ROOT}/.dev-server.pid"
WATCH_PID_FILE="${ROOT}/.dev-server.watch.pid"
LOG_FILE="${ROOT}/.dev-server.log"
PORT="${PORT:-3000}"
APP_URL="http://localhost:${PORT}"

cd "${ROOT}" || exit 1

is_pid_alive() {
  local pid="$1"
  [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null
}

port_pid() {
  lsof -tiTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null | head -1 || true
}

server_running() {
  local pid
  pid="$(port_pid)"
  [[ -n "${pid}" ]]
}

kill_tree() {
  local pid="$1"
  if ! is_pid_alive "${pid}"; then
    return 0
  fi
  pkill -P "${pid}" 2>/dev/null || true
  kill "${pid}" 2>/dev/null || true
  local _
  for _ in 1 2 3 4 5; do
    is_pid_alive "${pid}" || return 0
    sleep 0.4
  done
  kill -9 "${pid}" 2>/dev/null || true
  pkill -9 -P "${pid}" 2>/dev/null || true
}

# Detache un process hors du groupe Cursor (survit a la fin de la session agent)
detach_run() {
  local outfile="$1"
  shift
  /usr/bin/python3 - "$outfile" "$@" <<'PY'
import os, sys, subprocess
outfile = sys.argv[1]
cmd = sys.argv[2:]
with open(outfile, "a", encoding="utf-8") as log:
    subprocess.Popen(
        cmd,
        stdout=log,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
        cwd=os.environ.get("DEV_SERVER_ROOT") or os.getcwd(),
        start_new_session=True,
        close_fds=True,
    )
PY
}

stop_watchdog() {
  if [[ -f "${WATCH_PID_FILE}" ]]; then
    local wpid
    wpid="$(cat "${WATCH_PID_FILE}" 2>/dev/null || true)"
    if is_pid_alive "${wpid}"; then
      kill "${wpid}" 2>/dev/null || true
      sleep 0.3
      kill -9 "${wpid}" 2>/dev/null || true
    fi
    rm -f "${WATCH_PID_FILE}"
  fi
}

cmd_stop() {
  stop_watchdog

  local pid=""
  if [[ -f "${PID_FILE}" ]]; then
    pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
  fi
  if [[ -z "${pid}" ]]; then
    pid="$(port_pid)"
  fi

  if [[ -n "${pid}" ]]; then
    echo "Arret du serveur (pid ${pid})..."
    kill_tree "${pid}"
  fi

  local leftover
  leftover="$(port_pid)"
  if [[ -n "${leftover}" ]]; then
    echo "Liberation du port ${PORT} (pid ${leftover})..."
    kill_tree "${leftover}"
  fi

  # Tue aussi d'eventuels npm/next orphelins du projet
  pkill -f "${ROOT}/node_modules/.bin/next dev" 2>/dev/null || true

  rm -f "${PID_FILE}"
  echo "Serveur arrete."
}

start_once() {
  if server_running; then
    local pid
    pid="$(port_pid)"
    echo "Deja demarre sur ${APP_URL} (pid ${pid})"
    echo "${pid}" >"${PID_FILE}"
    return 0
  fi

  local occupied
  occupied="$(port_pid)"
  if [[ -n "${occupied}" ]]; then
    echo "Le port ${PORT} est occupe (pid ${occupied}). Arret..."
    kill_tree "${occupied}"
    sleep 0.5
  fi

  touch "${LOG_FILE}"
  {
    echo ""
    echo "===== $(date '+%Y-%m-%d %H:%M:%S') demarrage ====="
  } >>"${LOG_FILE}"

  echo "Demarrage de Next.js sur ${APP_URL}..."
  DEV_SERVER_ROOT="${ROOT}" detach_run "${LOG_FILE}" npm run dev

  # Attendre que le port ecoute (max ~45s) — ne pas se fier au vieux "Ready" du log
  local i pid
  for i in $(seq 1 90); do
    pid="$(port_pid)"
    if [[ -n "${pid}" ]]; then
      echo "${pid}" >"${PID_FILE}"
      echo "Pret -> ${APP_URL} (pid ${pid})"
      echo "Logs : ${LOG_FILE}"
      return 0
    fi
    sleep 0.5
  done

  echo "Echec : rien n'ecoute sur le port ${PORT}."
  echo "Dernieres lignes du log :"
  tail -n 40 "${LOG_FILE}" || true
  rm -f "${PID_FILE}"
  return 1
}

cmd_start() {
  stop_watchdog
  start_once
}

cmd_restart() {
  cmd_stop
  sleep 0.5
  start_once
}

cmd_status() {
  local pid
  pid="$(port_pid)"
  if [[ -n "${pid}" ]]; then
    echo "En ligne -> ${APP_URL} (pid ${pid})"
  else
    echo "Hors ligne (rien sur le port ${PORT})"
  fi

  if [[ -f "${WATCH_PID_FILE}" ]]; then
    local wpid
    wpid="$(cat "${WATCH_PID_FILE}" 2>/dev/null || true)"
    if is_pid_alive "${wpid}"; then
      echo "Watchdog actif (pid ${wpid}) - relance auto activee"
    else
      echo "Watchdog : fichier pid obsolete"
      rm -f "${WATCH_PID_FILE}"
    fi
  else
    echo "Watchdog : inactif (relance auto desactivee)"
  fi
}

cmd_logs() {
  touch "${LOG_FILE}"
  echo "Suivi de ${LOG_FILE} (Ctrl+C pour quitter)"
  tail -n 50 -f "${LOG_FILE}"
}

cmd_foreground() {
  stop_watchdog
  if server_running; then
    echo "Un serveur tourne deja. Lance : ./scripts/dev-server.sh stop"
    exit 1
  fi
  echo "Premier plan -> ${APP_URL} (Ctrl+C pour arreter)"
  exec npm run dev
}

cmd_watch() {
  if [[ -f "${WATCH_PID_FILE}" ]]; then
    local existing
    existing="$(cat "${WATCH_PID_FILE}" 2>/dev/null || true)"
    if is_pid_alive "${existing}" && [[ "${existing}" != "$$" ]]; then
      echo "Watchdog deja actif (pid ${existing})."
      cmd_status
      return 0
    fi
  fi

  if [[ "${DEV_SERVER_WATCHDOG:-}" != "1" ]]; then
    # Detache le watchdog hors session Cursor
    /usr/bin/python3 - "${ROOT}" "${WATCH_PID_FILE}" "${LOG_FILE}" <<'PY'
import os, sys, subprocess
root, watch_pid_file, log_file = sys.argv[1:4]
script = os.path.join(root, "scripts", "dev-server.sh")
env = os.environ.copy()
env["DEV_SERVER_WATCHDOG"] = "1"
with open(log_file, "a", encoding="utf-8") as log:
    proc = subprocess.Popen(
        ["bash", script, "watch"],
        stdout=log,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
        cwd=root,
        env=env,
        start_new_session=True,
        close_fds=True,
    )
with open(watch_pid_file, "w", encoding="utf-8") as f:
    f.write(str(proc.pid))
print(proc.pid)
PY
    local wpid
    wpid="$(cat "${WATCH_PID_FILE}")"
    sleep 2
    echo "Watchdog demarre (pid ${wpid})."
    echo "Relance auto activee. URL : ${APP_URL}"
    echo "Stop : ./scripts/dev-server.sh stop"
    echo "Logs : ./scripts/dev-server.sh logs"
    # Laisse le temps au 1er demarrage
    sleep 3
    cmd_status
    return 0
  fi

  echo "$(date '+%Y-%m-%d %H:%M:%S') - watchdog demarre"
  local backoff=2
  while true; do
    if ! server_running; then
      echo "$(date '+%Y-%m-%d %H:%M:%S') - serveur down, redemarrage..."
      rm -f "${PID_FILE}"
      if start_once; then
        backoff=2
      else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - echec, nouvel essai dans ${backoff}s"
        sleep "${backoff}"
        backoff=$((backoff * 2))
        if (( backoff > 60 )); then
          backoff=60
        fi
        continue
      fi
    else
      local live
      live="$(port_pid)"
      if [[ -n "${live}" ]]; then
        echo "${live}" >"${PID_FILE}"
      fi
    fi

    # Surveille le port (plus fiable que le pid npm)
    while server_running; do
      sleep 3
    done
    echo "$(date '+%Y-%m-%d %H:%M:%S') - port ${PORT} ferme"
    rm -f "${PID_FILE}"
    sleep 1
  done
}

usage() {
  cat <<EOF
Usage: $(basename "$0") <commande>

  start        Demarre le serveur en arriere-plan
  stop         Arrete le serveur (et le watchdog)
  restart      Redemarre le serveur
  status       Affiche l'etat
  watch        Demarre + relance auto si le serveur tombe
  logs         Suit les logs (.dev-server.log)
  foreground   Demarre au premier plan (terminal courant)
EOF
}

main() {
  local cmd="${1:-}"
  case "${cmd}" in
    start) cmd_start ;;
    stop) cmd_stop ;;
    restart) cmd_restart ;;
    status) cmd_status ;;
    watch) cmd_watch ;;
    logs) cmd_logs ;;
    foreground|fg) cmd_foreground ;;
    -h|--help|help|"") usage ;;
    *)
      echo "Commande inconnue : ${cmd}"
      usage
      exit 1
      ;;
  esac
}

main "${1:-}"
