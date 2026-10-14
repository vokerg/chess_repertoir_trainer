#!/usr/bin/env bash
# Remote command arguments are validated below and intentionally expanded locally.
# shellcheck disable=SC2029
set -euo pipefail
umask 077
: "${ORACLE_HOST:?Missing ORACLE_HOST}" "${ORACLE_USER:?Missing ORACLE_USER}"
: "${SSH_KEY:?Missing ORACLE_SSH_KEY}" "${HOST_KEY:?Missing ORACLE_SSH_HOST_KEY}"
[[ "$ORACLE_HOST" =~ ^[a-zA-Z0-9.-]+$ && "$ORACLE_USER" =~ ^[a-z_][a-z0-9_-]*$ ]] || exit 2
case "$OPERATION" in deploy|rollback|start|stop|restart) ;; *) exit 2;; esac
case "$SELECTION" in all|worker|api|web) ;; *) exit 2;; esac
ssh_dir=$(mktemp -d)
trap 'rm -rf "$ssh_dir"' EXIT
printf '%s\n' "$SSH_KEY" > "$ssh_dir/key"
printf '%s\n' "$HOST_KEY" > "$ssh_dir/known_hosts"
chmod 600 "$ssh_dir/"*
unset SSH_KEY HOST_KEY
ssh_args=(-i "$ssh_dir/key" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o "UserKnownHostsFile=$ssh_dir/known_hosts" -o ConnectTimeout=20 -o ServerAliveInterval=15 -o ServerAliveCountMax=4)
target="$ORACLE_USER@$ORACLE_HOST"
if [[ "$OPERATION" == deploy || "$OPERATION" == rollback ]]; then
  [[ "$SHA" =~ ^[0-9a-f]{40}$ && "$DIGEST" =~ ^sha256:[0-9a-f]{64}$ ]] || exit 2
  remote_dir=$(ssh "${ssh_args[@]}" "$target" 'mktemp -d /opt/chess-oracle/.incoming.XXXXXXXX')
  [[ "$remote_dir" =~ ^/opt/chess-oracle/\.incoming\.[a-zA-Z0-9]+$ ]] || exit 2
  cleanup() {
    ssh "${ssh_args[@]}" "$target" "rm -rf -- '$remote_dir'" || true
    rm -rf "$ssh_dir"
  }
  trap cleanup EXIT
  cp deploy/docker/compose.yml "$ssh_dir/compose.yml"
  cp deploy/oracle/compose.yml "$ssh_dir/oracle.yml"
  cp deploy/oracle/control.sh "$ssh_dir/control.sh"
  cp deploy/oracle/prune-images.py "$ssh_dir/prune-images.py"
  tar -C "$ssh_dir" -cf - compose.yml oracle.yml control.sh prune-images.py | ssh "${ssh_args[@]}" "$target" "tar -xf - -C '$remote_dir'"
  # The remote Docker auth file is temporary and removed by cleanup, even on failure.
  printf '%s' "$REGISTRY_TOKEN" | ssh "${ssh_args[@]}" "$target" "docker --config '$remote_dir/auth' login ghcr.io --username '$REGISTRY_USER' --password-stdin"
  ssh "${ssh_args[@]}" "$target" "DOCKER_CONFIG='$remote_dir/auth' bash '$remote_dir/control.sh' '$OPERATION' all '$SHA' '$DIGEST'"
else
  ssh "${ssh_args[@]}" "$target" "bash /opt/chess-oracle/current/control.sh '$OPERATION' '$SELECTION'"
fi
printf '### Oracle %s: success\n\nCommit: %s\n\nImage: ghcr.io/vokerg/chess-repertoir-trainer@%s\n\nServices: %s\n' \
  "$OPERATION" "${SHA:-previously deployed}" "${DIGEST:-persisted on VM}" "$SELECTION" >> "$GITHUB_STEP_SUMMARY"
