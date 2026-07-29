#!/usr/bin/env bash
# Pone <lastmod> = hoy en las URLs del sitemap cuyo HTML va en este commit.
# Las páginas que no cambian conservan su fecha: un lastmod que miente
# hace que Google deje de confiar en él.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

[[ -f sitemap.xml ]] || { echo "sitemap-lastmod: no hay sitemap.xml" >&2; exit 0; }

# HTML ya en el índice (el pre-commit corre después de git add)
CHANGED="$(git diff --cached --name-only --diff-filter=ACM -- '*.html' || true)"
[[ -n "$CHANGED" ]] || { echo "sitemap-lastmod: sin HTML en el commit"; exit 0; }

CHANGED="$CHANGED" python3 - <<'PY'
import os, re, subprocess, datetime, pathlib

changed = {p.strip() for p in os.environ["CHANGED"].splitlines() if p.strip()}
today = datetime.date.today().isoformat()
base = "https://ifee09.github.io/DrMarceloMarquez/"
sm = pathlib.Path("sitemap.xml")
text = sm.read_text(encoding="utf-8")

def path_for(loc):
    rel = loc[len(base):] if loc.startswith(base) else loc
    return "index.html" if rel in ("", "/") else rel

updated = []

def fix(m):
    block = m.group(0)
    loc_m = re.search(r"<loc>([^<]*)</loc>", block)
    if not loc_m:
        return block
    p = path_for(loc_m.group(1))
    if p in changed and "<lastmod>" in block:
        new = re.sub(r"<lastmod>[^<]*</lastmod>", f"<lastmod>{today}</lastmod>", block)
        if new != block:
            updated.append(p)
            return new
    return block

text2 = re.sub(r"<url>.*?</url>", fix, text, flags=re.DOTALL)
if text2 != text:
    sm.write_text(text2, encoding="utf-8")
    print(f"sitemap-lastmod: {len(updated)} URLs -> {today}")
    subprocess.run(["git", "add", "sitemap.xml"], check=True)
else:
    print("sitemap-lastmod: sin cambios")
PY
