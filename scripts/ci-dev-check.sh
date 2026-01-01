#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
compose_file="$root_dir/infra/docker/docker-compose.yml"

api_log="$(mktemp)"
web_log="$(mktemp)"

cleanup() {
  # Stop dev servers if they are still running and clean temp logs
  if [[ -n "${API_PID:-}" ]]; then kill "${API_PID}" 2>/dev/null || true; fi
  if [[ -n "${WEB_PID:-}" ]]; then kill "${WEB_PID}" 2>/dev/null || true; fi
  wait "${API_PID:-}" 2>/dev/null || true
  wait "${WEB_PID:-}" 2>/dev/null || true
  if [[ "${OSRM_STARTED:-0}" == 1 ]]; then
    docker compose -f "$compose_file" stop osrm osrm-prep osrm-download >/dev/null 2>&1 || true
    docker compose -f "$compose_file" rm -fsv osrm osrm-prep osrm-download >/dev/null 2>&1 || true
  fi
  rm -f "$api_log" "$web_log"
}
trap cleanup EXIT

export SKIP_OSRM="${SKIP_OSRM:-1}"
export OSRM_AUTO="${OSRM_AUTO:-0}"
enable_osrm="${ENABLE_OSRM:-1}"

if [[ "$enable_osrm" == "1" || "$enable_osrm" == "true" ]]; then
  echo "ENABLE_OSRM=1 -> starting OSRM via docker compose (may take several minutes on first run)..."
  if ! command -v docker >/dev/null; then
    echo "Docker is required to start OSRM; aborting." >&2
    exit 1
  fi
  docker compose -f "$compose_file" --profile osrm up -d osrm
  OSRM_STARTED=1
fi

echo "Starting API dev server (services-api)..."
PORT=3001 HOST=0.0.0.0 pnpm --filter services-api dev >"$api_log" 2>&1 &
API_PID=$!

echo "Starting frontend dev server (apps-web-frontend)..."
pnpm --filter apps-web-frontend dev -- --hostname 0.0.0.0 --port 3002 >"$web_log" 2>&1 &
WEB_PID=$!

echo "Waiting for dev servers to answer..."
ready=false
for _ in {1..60}; do
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "API dev server exited early:"; cat "$api_log"; exit 1
  fi
  if ! kill -0 "$WEB_PID" 2>/dev/null; then
    echo "Frontend dev server exited early:"; cat "$web_log"; exit 1
  fi

  api_ok=false
  web_ok=false

  if curl -sf "http://localhost:3001/api/health" >/dev/null; then api_ok=true; fi
  if curl -sf "http://localhost:3002" >/dev/null; then web_ok=true; fi

  if $api_ok && $web_ok; then ready=true; break; fi

  sleep 2
done

if [[ "$ready" != true ]]; then
  echo "Dev servers did not become ready in time."
  echo "--- API log ---"; cat "$api_log"
  echo "--- Frontend log ---"; cat "$web_log"
  exit 1
fi

echo "Dev servers responded successfully; stopping them."
kill "$API_PID" "$WEB_PID" 2>/dev/null || true
wait "$API_PID" 2>/dev/null || true
wait "$WEB_PID" 2>/dev/null || true

echo "Dev startup check complete."
