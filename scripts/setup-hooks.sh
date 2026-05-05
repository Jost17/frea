#!/usr/bin/env bash
# Aktiviert die Repo-eigenen Git-Hooks unter .githooks/
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

git config core.hooksPath .githooks
chmod +x .githooks/* 2>/dev/null || true

echo "✓ Git-Hooks aktiviert (core.hooksPath=.githooks)"
echo "  Aktive Hooks:"
ls -1 .githooks | sed 's/^/    /'
