#!/usr/bin/env bash
set -euo pipefail

DB_PATH="$HOME/Library/Application Support/com.memcycle.app/app.db"

pkill -f MemCycle >/dev/null 2>&1 || true
mkdir -p "$(dirname "$DB_PATH")"

if [ -f "$DB_PATH" ]; then
  rm -f "$DB_PATH"
fi

echo "Reset native DB at: $DB_PATH"
