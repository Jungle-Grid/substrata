#!/usr/bin/env bash
set -Eeuo pipefail

: "${SUBSTRATA_MODEL:?SUBSTRATA_MODEL must be supplied by the Jungle Grid job}"
: "${SUBSTRATA_PROMPT:?SUBSTRATA_PROMPT must be supplied by the Jungle Grid job}"

ollama serve >/tmp/ollama-runtime.log 2>&1 &
OLLAMA_PID=$!
trap 'kill "${OLLAMA_PID}" 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  if ollama list >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

ollama run "${SUBSTRATA_MODEL}" "${SUBSTRATA_PROMPT}"
