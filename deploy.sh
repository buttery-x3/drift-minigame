#!/usr/bin/env bash
set -euo pipefail

# Run from the repository root regardless of where this script is invoked.
cd "$(dirname "${BASH_SOURCE[0]}")"

git pull --ff-only
npm ci
export VITE_BASE_PATH="${VITE_BASE_PATH:-/racing/}"
export PORT="${PORT:-4001}"
export HOSTS="${HOSTS:-127.0.0.1,::1}"
npm run build
npm run pm2:reload
pm2 save
pm2 status drift-minigame
