#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

APP_DIR="${SUBSTRATA_APP_DIR:-/opt/substrata}"
BRANCH="${SUBSTRATA_BRANCH:-main}"
ENV_FILE="infra/.env.production"
BACKUP_DIR="/root/backups/substrata"

log() {
  printf '\n\033[1;36m==> %s\033[0m\n' "$*"
}

fail() {
  printf '\n\033[1;31mDeployment failed: %s\033[0m\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

require_command git
require_command docker
require_command curl
require_command pnpm
require_command date

cd "$APP_DIR" || fail "Application directory not found: $APP_DIR"
[[ -f "$ENV_FILE" ]] || fail "Missing environment file: $ENV_FILE"
[[ -z "$(git status --porcelain)" ]] || fail "Git working tree is not clean."

COMPOSE=(docker compose --env-file "$ENV_FILE")

show_failure_logs() {
  printf '\nRecent Substrata logs:\n' >&2
  "${COMPOSE[@]}" logs --since=10m --tail=250 migrate api web 2>&1 || true
}
trap 'show_failure_logs' ERR

log "Updating source"
git pull --ff-only origin "$BRANCH"

log "Installing locked host dependencies for validation"
pnpm install --frozen-lockfile

log "Validating production environment and Compose"
pnpm validate:production-env
"${COMPOSE[@]}" config --quiet

log "Building production images"
"${COMPOSE[@]}" build --pull migrate api web

log "Starting PostgreSQL"
"${COMPOSE[@]}" up -d postgres

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

STAMP="$(date +%F-%H%M%S)"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="${BACKUP_DIR}/substrata-${STAMP}.dump"
TMP_BACKUP_FILE="${BACKUP_FILE}.tmp"

log "Backing up PostgreSQL"
"${COMPOSE[@]}" exec -T postgres   pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$TMP_BACKUP_FILE"
[[ -s "$TMP_BACKUP_FILE" ]] || fail "Database backup was empty"
mv "$TMP_BACKUP_FILE" "$BACKUP_FILE"

log "Applying migrations"
"${COMPOSE[@]}" run --rm migrate

log "Starting API and web"
"${COMPOSE[@]}" up -d --remove-orphans api web

API_HEALTH_URL="http://127.0.0.1:${API_PORT}/v1/health"
WEB_HEALTH_URL="http://127.0.0.1:${WEB_PORT}/"

log "Checking API and web health"
curl --fail --silent --show-error "$API_HEALTH_URL" >/dev/null
curl --fail --silent --show-error "$WEB_HEALTH_URL" >/dev/null

"${COMPOSE[@]}" ps
"${COMPOSE[@]}" logs --since=10m --tail=250 migrate api web

log "Deployment complete"
printf 'Commit: %s\n' "$(git rev-parse --short HEAD)"
printf 'Database backup: %s\n' "$BACKUP_FILE"
