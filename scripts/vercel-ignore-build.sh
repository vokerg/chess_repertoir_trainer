#!/usr/bin/env bash
set -u -o pipefail

# Vercel Ignored Build Step semantics:
#   exit 0 => skip the build
#   exit non-zero => continue the build
#
# Prefer the last successful deployment SHA when Vercel exposes it. If that
# commit is outside Vercel's shallow clone, build conservatively rather than
# risk skipping a required production deployment.

HEAD_SHA="${VERCEL_GIT_COMMIT_SHA:-HEAD}"
PREVIOUS_SHA="${VERCEL_GIT_PREVIOUS_SHA:-}"

if ! git rev-parse --verify "${HEAD_SHA}^{commit}" >/dev/null 2>&1; then
  echo "Unable to resolve the deployment commit; continuing the Vercel build."
  exit 1
fi

if [[ -n "${PREVIOUS_SHA}" ]]; then
  if git rev-parse --verify "${PREVIOUS_SHA}^{commit}" >/dev/null 2>&1; then
    BASE_SHA="${PREVIOUS_SHA}"
  else
    echo "Previous successful deployment commit is outside the shallow clone; continuing the Vercel build."
    exit 1
  fi
elif git rev-parse --verify "${HEAD_SHA}^" >/dev/null 2>&1; then
  BASE_SHA="${HEAD_SHA}^"
else
  echo "No comparison commit is available; continuing the Vercel build."
  exit 1
fi

echo "Checking web deployment impact from ${BASE_SHA} to ${HEAD_SHA}."

git diff --quiet "${BASE_SHA}" "${HEAD_SHA}" -- \
  apps/web \
  packages/chess-domain \
  packages/contracts \
  package.json \
  package-lock.json \
  angular.json \
  tsconfig.base.json \
  .nvmrc \
  vercel.json

diff_status=$?

case "${diff_status}" in
  0)
    echo "No web-affecting changes detected; skipping the Vercel build."
    exit 0
    ;;
  1)
    echo "Web-affecting changes detected; continuing the Vercel build."
    exit 1
    ;;
  *)
    echo "Unable to determine changed paths; continuing the Vercel build."
    exit 1
    ;;
esac
