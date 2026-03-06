#!/bin/sh
set -eu

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
  echo "Usage: $0 <prompt-file> [repo-dir]" >&2
  exit 1
fi

PROMPT_FILE=$1
REPO_DIR=${2:-$(pwd)}

if [ ! -f "$PROMPT_FILE" ]; then
  echo "Prompt file not found: $PROMPT_FILE" >&2
  exit 1
fi

if [ ! -d "$REPO_DIR" ]; then
  echo "Repo dir not found: $REPO_DIR" >&2
  exit 1
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "claude not found in PATH" >&2
  exit 1
fi

cd "$REPO_DIR"

: > PLAN.md
: > PROGRESS.md

cat "$PROMPT_FILE" | claude --dangerously-skip-permissions