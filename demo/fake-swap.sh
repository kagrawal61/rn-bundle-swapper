#!/usr/bin/env bash
# Demo wrapper: passes --help to real CLI, simulates swap for everything else.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ "$*" == *"--help"* ]] || [[ "$*" == *"-h"* ]] || [[ $# -eq 0 ]]; then
  node "$PROJECT_ROOT/dist/cli.js" "$@"
else
  exec bash "$PROJECT_ROOT/demo/simulate.sh"
fi
