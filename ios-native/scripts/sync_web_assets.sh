#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_NATIVE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${IOS_NATIVE_DIR}/.." && pwd)"
WEBAPP_DIR="${IOS_NATIVE_DIR}/ConjugQuestIOS/WebApp"

mkdir -p "${WEBAPP_DIR}"

rsync -a --delete --prune-empty-dirs \
  --exclude=".DS_Store" \
  --include="/index.html" \
  --include="/styles.css" \
  --include="/site.webmanifest" \
  --include="/sprite-manifest.json" \
  --include="/level_generation_config.json" \
  --include="/level-blocks.json" \
  --include="/assets/***" \
  --include="/game_assets/***" \
  --include="/src/***" \
  --exclude="*" \
  "${REPO_ROOT}/" \
  "${WEBAPP_DIR}/"

echo "Web assets synced into: ${WEBAPP_DIR}"
