#!/usr/bin/env bash
# Headless screenshot of the celebration screen with the prize image.
#
# Run this AFTER the worktree branch has been merged into main and the
# Flask server has been restarted (or its static/ rebuild has been picked
# up). Usage:
#
#     bash .planning/quick/260430-m7w-display-prize-jpeg-on-completion-screen-/screenshot.sh
#
# Requirements:
#   - Flask server reachable at http://localhost:5001
#   - npx available; will fetch playwright on the fly if missing
#
# Output:
#   .planning/quick/260430-m7w-display-prize-jpeg-on-completion-screen-/preview-celebration.png

set -euo pipefail

PLAN_DIR=".planning/quick/260430-m7w-display-prize-jpeg-on-completion-screen-"
OUT="${PLAN_DIR}/preview-celebration.png"
URL="http://localhost:5001/#preview-celebration"

# 1. Confirm server is reachable.
if ! curl -sf -o /dev/null "http://localhost:5001/"; then
  echo "ERROR: http://localhost:5001/ is not reachable. Start the Flask server first." >&2
  exit 1
fi

# 2. Confirm /prize.jpeg is being served.
if ! curl -sf -o /dev/null "http://localhost:5001/prize.jpeg"; then
  echo "ERROR: http://localhost:5001/prize.jpeg is not reachable. Did 'npm run build' run after the merge?" >&2
  exit 1
fi

# 3. Take the screenshot via Playwright. The 1.5s wait covers the
#    celebration's opacity transition + a representative confetti frame.
npx -y playwright@1.59.1 screenshot \
  --viewport-size=1280,900 \
  --wait-for-timeout=1500 \
  --full-page \
  "${URL}" \
  "${OUT}"

# 4. Sanity-check size: a real screenshot of gradient + image + confetti is
#    well above 20KB; a blank/error frame would be much smaller.
if command -v stat >/dev/null 2>&1; then
  SIZE=$(stat -f%z "${OUT}" 2>/dev/null || stat -c%s "${OUT}")
else
  SIZE=$(wc -c < "${OUT}" | tr -d ' ')
fi

if [ "${SIZE}" -lt 20000 ]; then
  echo "ERROR: Screenshot is only ${SIZE} bytes (< 20KB). Likely a blank/error frame." >&2
  exit 1
fi

echo "OK: ${OUT} (${SIZE} bytes)"
