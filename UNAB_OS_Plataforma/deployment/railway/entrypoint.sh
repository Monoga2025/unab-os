#!/bin/bash
set -Eeuo pipefail

readonly DATA_ROOT="/data"
readonly APP_USER="unab"
readonly APP_GROUP="unab"
readonly DEFAULT_CONTEXT="/opt/jarvis/ACADEMIC_CONTEXT.default.md"

export PORT="${PORT:-3000}"
export HOSTNAME="0.0.0.0"
export TEMA_DATA_ROOT="${TEMA_DATA_ROOT:-${DATA_ROOT}/tema}"
export JARVIS_BRIDGE_PATH="${JARVIS_BRIDGE_PATH:-${DATA_ROOT}/university-os-bridge}"
export UNAB_OS_BRIDGE_PATH="${UNAB_OS_BRIDGE_PATH:-${JARVIS_BRIDGE_PATH}}"
export JARVIS_DB_PATH="${JARVIS_DB_PATH:-${DATA_ROOT}/jarvis/jarvis.db}"
export JARVIS_CONTEXT_PATH="${JARVIS_CONTEXT_PATH:-${DATA_ROOT}/jarvis/ACADEMIC_CONTEXT.md}"

install -d -m 0750 -o "${APP_USER}" -g "${APP_GROUP}" \
  "${DATA_ROOT}/jarvis" \
  "${JARVIS_BRIDGE_PATH}" \
  "${JARVIS_BRIDGE_PATH}/documents" \
  "${JARVIS_BRIDGE_PATH}/outbox" \
  "${JARVIS_BRIDGE_PATH}/processing" \
  "${JARVIS_BRIDGE_PATH}/delivered" \
  "${JARVIS_BRIDGE_PATH}/failed" \
  "${JARVIS_BRIDGE_PATH}/reports"

if [[ ! -e "${JARVIS_CONTEXT_PATH}" ]]; then
  install -m 0640 -o "${APP_USER}" -g "${APP_GROUP}" "${DEFAULT_CONTEXT}" "${JARVIS_CONTEXT_PATH}"
fi

next_pid=""
jarvis_pid=""
termination_requested=0

stop_children() {
  [[ -z "${next_pid}" ]] || kill -TERM "${next_pid}" 2>/dev/null || true
  [[ -z "${jarvis_pid}" ]] || kill -TERM "${jarvis_pid}" 2>/dev/null || true
}

handle_termination() {
  termination_requested=1
  stop_children
}

trap handle_termination TERM INT

gosu "${APP_USER}:${APP_GROUP}" node /app/server.js &
next_pid=$!

gosu "${APP_USER}:${APP_GROUP}" /opt/jarvis-venv/bin/jarvis-telegram &
jarvis_pid=$!

set +e
wait -n "${next_pid}" "${jarvis_pid}"
exit_code=$?
set -e

if (( termination_requested == 0 )); then
  if ! kill -0 "${next_pid}" 2>/dev/null; then
    echo "Universidad OS terminó inesperadamente; deteniendo Jarvis." >&2
  else
    echo "Jarvis terminó inesperadamente; deteniendo Universidad OS." >&2
  fi
  stop_children
fi

wait "${next_pid}" 2>/dev/null || true
wait "${jarvis_pid}" 2>/dev/null || true

if (( termination_requested == 1 )); then
  exit 0
fi
if (( exit_code == 0 )); then
  exit 1
fi
exit "${exit_code}"
