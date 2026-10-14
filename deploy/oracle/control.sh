#!/usr/bin/env bash
# Run as the dedicated deployment user, never through sudo.
set -euo pipefail
umask 077
root=${ORACLE_DEPLOY_DIR:-/opt/chess-oracle}
operation=${1:?operation required}
selection=${2:-all}
sha=${3:-}
digest=${4:-}
case "$operation" in deploy|rollback|start|stop|restart) ;; *) exit 2 ;; esac
case "$selection" in all) services=(web api worker);; web) services=(api web);; api|worker) services=("$selection");; *) exit 2;; esac
[[ -d "$root" && -f "$root/stack.env" ]] || { echo 'Protected stack.env is required'; exit 1; }
[[ $(stat -c %a "$root/stack.env") == 600 ]] || { echo 'stack.env must have mode 600'; exit 1; }
exec 9>"$root/.operation.lock"
flock -w 600 9
export WEB_BIND_ADDRESS=127.0.0.1 WEB_PORT=8080
export COMPOSE_DISABLE_ENV_FILE=1
compose() {
  docker compose --project-name chess-oracle --project-directory "$root" \
    --env-file "$root/deployment.env" -f "$root/current/compose.yml" \
    -f "$root/current/oracle.yml" "$@"
}
verify() {
  local service id before
  for service in "${services[@]}"; do
    id=$(compose ps -q "$service")
    [[ -n "$id" ]] || { echo "$service is missing"; return 1; }
    [[ $(docker inspect -f '{{.State.Running}}' "$id") == true ]] || return 1
    if [[ "$service" == worker ]]; then
      before=$(docker inspect -f '{{.RestartCount}}:{{.State.StartedAt}}' "$id")
      sleep 20
      [[ $(docker inspect -f '{{.State.Running}}:{{.RestartCount}}:{{.State.StartedAt}}' "$id") == "true:$before" ]] || return 1
      docker logs "$id" 2>&1 | grep 'Persistent job worker started' >/dev/null
      docker logs "$id" 2>&1 | grep 'Account import worker started' >/dev/null
      # /health is deliberately lightweight; verify the shared DB separately.
      # JavaScript template literal and Prisma dollar identifiers must remain literal.
      # shellcheck disable=SC2016
      compose exec -T worker node -e 'const {PrismaClient}=require("@prisma/client"); const p=new PrismaClient(); p.$queryRaw`SELECT 1`.then(()=>p.$disconnect()).catch(()=>{console.error("Database probe failed");process.exit(1)})'
    fi
  done
  if [[ " $selection " == ' all ' || "$selection" == web ]]; then
    curl --fail --silent --output /dev/null http://127.0.0.1:8080/
    curl --fail --silent --output /dev/null http://127.0.0.1:8080/health
  fi
}
if [[ "$operation" == deploy || "$operation" == rollback ]]; then
  [[ "$selection" == all && "$sha" =~ ^[0-9a-f]{40}$ && "$digest" =~ ^sha256:[0-9a-f]{64}$ ]] || exit 2
  bundle=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
  image="ghcr.io/vokerg/chess-repertoir-trainer@$digest"
  docker pull "$image"
  [[ $(docker image inspect -f '{{.Architecture}}' "$image") == arm64 ]] || { echo 'ARM64 image required'; exit 1; }
  # Verify secrets/config parsing before stopping an existing deployment; never print config.
  IMAGE_REFERENCE="$image" docker compose --project-name chess-oracle --project-directory "$root" \
    -f "$bundle/compose.yml" -f "$bundle/oracle.yml" config --quiet
  if [[ -e "$root/current" ]]; then compose stop; fi
  release="$root/releases/$sha"
  mkdir -p "$release"
  cp "$bundle/compose.yml" "$bundle/oracle.yml" "$bundle/control.sh" "$bundle/prune-images.py" "$release/"
  if [[ -f "$root/deployment.env" ]]; then cp "$root/deployment.env" "$root/previous.env"; fi
  printf 'IMAGE_REFERENCE=%s\nDEPLOYED_SHA=%s\n' "$image" "$sha" > "$root/deployment.env.new"
  mv "$root/deployment.env.new" "$root/deployment.env"
  ln -sfn "releases/$sha" "$root/current.new"
  mv -Tf "$root/current.new" "$root/current"
  # Persist BEFORE mutation: Start can recover this exact version after an interrupted deploy.
  compose up -d --force-recreate --wait --wait-timeout 180
  verify
  printf '%s %s %s\n' "$(date -u +%FT%TZ)" "$sha" "$image" >> "$root/history.log"
  python3 "$release/prune-images.py" "$root" || echo "Image cleanup skipped; inspect disk usage"
else
  [[ -f "$root/deployment.env" && -e "$root/current" ]] || { echo 'Deploy first'; exit 1; }
  case "$operation" in
    stop)
      # Stop only the requested service; stopping API may temporarily make web return 502.
      if [[ "$selection" == all ]]; then compose stop; else compose stop "$selection"; fi
      ;;
    start) compose up -d --wait --wait-timeout 180 "${services[@]}"; verify ;;
    restart) compose restart "${services[@]}"; compose up -d --wait --wait-timeout 180 "${services[@]}"; verify ;;
  esac
fi
compose ps --all
printf 'Oracle operation=%s selection=%s result=success\n' "$operation" "$selection"
# Only non-secret version metadata; never show stack.env or full Compose config/logs.
cat "$root/deployment.env"
