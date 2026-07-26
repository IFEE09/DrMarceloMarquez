#!/usr/bin/env bash
# Tras un push a GitHub Pages: espera el deploy y pide de nuevo las URLs clave
# con no-cache para refrescar el edge (Varnish). El bust ?v=hash cubre el navegador.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE_URL="${PAGES_URL:-https://ifee09.github.io/DrMarceloMarquez}"
BASE_URL="${BASE_URL%/}"

SHA="$(git rev-parse --short HEAD)"
BUST="$(date +%s)"

EXPECTED_V="$(
  python3 - <<'PY'
import pathlib, re
t = pathlib.Path("index.html").read_text(encoding="utf-8")
m = re.search(r"styles\.css\?v=([A-Za-z0-9]+)", t)
print(m.group(1) if m else "")
PY
)"

echo "refresh-pages: base=${BASE_URL} sha=${SHA} want=v=${EXPECTED_V:-none}"

wait_for_deploy() {
  local index_url="${BASE_URL}/index.html"
  local i body code
  for i in $(seq 1 24); do
    body="$(mktemp)"
    code="$(curl -sS -o "$body" -w '%{http_code}' \
      -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' \
      "${index_url}?refresh=${BUST}-${i}" || true)"
    if [[ "$code" == "200" ]]; then
      if [[ -z "${EXPECTED_V}" ]] || grep -q "styles.css?v=${EXPECTED_V}" "$body"; then
        rm -f "$body"
        echo "refresh-pages: deploy OK (v=${EXPECTED_V:-any}, intento ${i})"
        return 0
      fi
    fi
    rm -f "$body"
    echo "refresh-pages: esperando deploy… (${i}/24) http=${code:-err} want=v=${EXPECTED_V}"
    sleep 5
  done
  echo "refresh-pages: timeout esperando Pages; igual se refrescan URLs" >&2
  return 0
}

fetch_nocache() {
  local url="$1"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' \
    -H 'Cache-Control: no-cache' \
    -H 'Pragma: no-cache' \
    "${url}" || echo err)"
  echo "  [${code}] ${url}"
}

wait_for_deploy

PATHS=(
  "/"
  "/index.html"
  "/faq.html"
  "/preparacion.html"
  "/assets/css/styles.css"
  "/assets/js/main.js"
  "/sitemap.xml"
  "/servicios/ultrasonido-doppler-vascular.html"
  "/servicios/ultrasonido-musculoesqueletico.html"
  "/servicios/ultrasonido-abdominal.html"
)

echo "refresh-pages: invalidando/recalentando URLs…"
for p in "${PATHS[@]}"; do
  fetch_nocache "${BASE_URL}${p}?v=${SHA}&nocache=${BUST}"
done

if [[ -n "${EXPECTED_V}" ]]; then
  echo "refresh-pages: assets con v=${EXPECTED_V}"
  fetch_nocache "${BASE_URL}/assets/css/styles.css?v=${EXPECTED_V}&nocache=${BUST}"
  fetch_nocache "${BASE_URL}/assets/js/main.js?v=${EXPECTED_V}&nocache=${BUST}"
fi

echo "refresh-pages: listo"
