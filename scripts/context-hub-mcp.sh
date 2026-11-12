#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
export CHUB_DIR="$ROOT/.local/chub"
export CHUB_TELEMETRY=0
export CHUB_FEEDBACK=0
NODE=$(cat "$ROOT/.local/node-path")
exec "$NODE" "$ROOT/node_modules/@aisuite/chub/bin/chub-mcp"
