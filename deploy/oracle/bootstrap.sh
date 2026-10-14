#!/usr/bin/env bash
# Run through an administrator SSH session on an approved dedicated VM.
set -euo pipefail
[[ $EUID == 0 ]] || { echo 'Run with sudo'; exit 1; }
# shellcheck source=/dev/null
. /etc/os-release
[[ "$ID" == ubuntu && "$VERSION_ID" == 24.04 && $(uname -m) == aarch64 ]] || {
  echo 'Expected Ubuntu 24.04 ARM64; inspect this host before proceeding'; exit 1;
}
if ! command -v docker >/dev/null; then
  if dpkg -l docker.io containerd podman-docker 2>/dev/null | grep '^ii ' >/dev/null; then
    echo 'Existing container runtime detected; review manually'; exit 1
  fi
  apt-get update
  apt-get install -y ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  cat > /etc/apt/sources.list.d/docker.sources <<SOURCES
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: noble
Components: stable
Architectures: arm64
Signed-By: /etc/apt/keyrings/docker.asc
SOURCES
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
docker compose version
systemctl enable --now docker
docker info >/dev/null
if ! id chess-deploy >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash chess-deploy
  passwd -l chess-deploy
fi
# Docker membership is root-equivalent. Use only on the dedicated application VM.
usermod -aG docker chess-deploy
install -d -o chess-deploy -g chess-deploy -m 0700 /opt/chess-oracle
install -d -o chess-deploy -g chess-deploy -m 0700 /home/chess-deploy/.ssh
free -h
df -h /opt/chess-oracle
echo 'Install public deployment key with authorized_keys restrict; stack.env must be mode 600.'
echo 'Review SSH/firewall rules before deployment. No ingress or existing Docker configuration was changed.'
