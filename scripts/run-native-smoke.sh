#!/usr/bin/env bash
set -euo pipefail

echo "[native-smoke] building app..."
bun run tauri build

echo "[native-smoke] running native smoke tests..."
bunx playwright test -c playwright.native.config.ts
