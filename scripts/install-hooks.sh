#!/usr/bin/env bash
# Activa los hooks del repo (.githooks) en este clone.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

chmod +x "$ROOT"/scripts/*.sh "$ROOT"/.githooks/*

git config core.hooksPath .githooks

echo "install-hooks: core.hooksPath=.githooks"
echo "  · pre-commit → cache-bust (?v=hash en CSS/JS)"
echo "  · pre-push   → refresh CDN de GitHub Pages en background"
echo ""
echo "Para push + refresh en primer plano: ./scripts/push.sh"
