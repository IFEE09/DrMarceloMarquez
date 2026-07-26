#!/usr/bin/env bash
# Estampa ?v=<hash> en styles.css y main.js de todos los HTML.
# El hash sale del contenido de esos archivos: si cambian, el navegador pide URL nueva.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CSS="$ROOT/assets/css/styles.css"
JS="$ROOT/assets/js/main.js"

if [[ ! -f "$CSS" || ! -f "$JS" ]]; then
  echo "cache-bust: no encuentro assets/css/styles.css o assets/js/main.js" >&2
  exit 1
fi

HASH="$(
  {
    shasum -a 256 "$CSS"
    shasum -a 256 "$JS"
  } | shasum -a 256 | cut -c1-10
)"

echo "cache-bust: v=${HASH}"

python3 - "$HASH" <<'PY'
import pathlib, re, sys

version = sys.argv[1]
root = pathlib.Path(".").resolve()
patterns = [
    (re.compile(r'(href=["\'](?:\.\./)?assets/css/styles\.css)(?:\?v=[^"\']*)?(["\'])'),
     rf'\1?v={version}\2'),
    (re.compile(r'(src=["\'](?:\.\./)?assets/js/main\.js)(?:\?v=[^"\']*)?(["\'])'),
     rf'\1?v={version}\2'),
]

changed = []
for path in sorted(root.rglob("*.html")):
    if "docs" in path.parts or "node_modules" in path.parts:
        continue
    text = path.read_text(encoding="utf-8")
    new = text
    for rx, repl in patterns:
        new = rx.sub(repl, new)
    if new != text:
        path.write_text(new, encoding="utf-8")
        changed.append(str(path.relative_to(root)))

if changed:
    print(f"cache-bust: actualizados {len(changed)} HTML")
    for p in changed:
        print(f"  · {p}")
else:
    print("cache-bust: HTML ya tenían esta versión")
PY
