#!/usr/bin/env bash
# التشغيل من جذر المشروع: bash scripts/spec-render/run.sh
set -e
cd "$(dirname "$0")/../.."
npx --yes esbuild@0.24.2 scripts/spec-render/check.mts --bundle --platform=node --format=esm \
  --outfile=/tmp/bz-spec-render.mjs --log-level=error --alias:@=./src
node /tmp/bz-spec-render.mjs
