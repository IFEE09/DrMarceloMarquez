#!/usr/bin/env bash
# Push a origin y refresca la caché de GitHub Pages.
# Uso: ./scripts/push.sh
#      ./scripts/push.sh origin HEAD
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Asegura ?v=hash en HTML si CSS/JS cambiaron (debe ir en el commit)
if [[ -x "$ROOT/scripts/cache-bust.sh" ]]; then
  "$ROOT/scripts/cache-bust.sh"
  if ! git diff --quiet -- '*.html'; then
    echo "push: hay HTML con nuevo ?v= sin commitear." >&2
    echo "       haz commit de esos HTML (o usa el hook pre-commit) y vuelve a pushear." >&2
    git status -sb -- '*.html' >&2
    exit 1
  fi
fi

REMOTE="${1:-origin}"
REF="${2:-HEAD}"

echo "push: git push ${REMOTE} ${REF}"
git push -u "$REMOTE" "$REF"

echo "push: refrescando caché de Pages…"
PAGES_URL="${PAGES_URL:-https://ifee09.github.io/DrMarceloMarquez}" \
  "$ROOT/scripts/refresh-pages-cache.sh"

echo "push: terminado — hard refresh en el navegador (Cmd+Shift+R) si aún ves CSS viejo"
