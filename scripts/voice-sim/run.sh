#!/usr/bin/env bash
# اختبار محاكاة الصوت — يحاكي Cloudflare SFU وFirebase والمتصفّح ويتحقّق من إصلاحات v7
# التشغيل من جذر المشروع:  bash scripts/voice-sim/run.sh
set -e
cd "$(dirname "$0")"
npx --yes esbuild@0.24.2 test.mts --bundle --platform=node --format=esm --outfile=/tmp/bz-voice-sim.mjs --log-level=warning \
  --alias:@/features=../../src/features --alias:@/lib/realtime=../../src/lib/realtime \
  --alias:@/lib/firebase/config=./mocks/config.js --alias:firebase/database=./mocks/firebase-database.js
node /tmp/bz-voice-sim.mjs 2>&1 | grep -E "^(✓|✗)|نجح"
