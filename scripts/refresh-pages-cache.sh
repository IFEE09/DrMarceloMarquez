#!/usr/bin/env bash
# Tras un push a GitHub Pages: espera el deploy y pide de nuevo las URLs clave
# con no-cache para refrescar el edge (Varnish). El bust ?v=hash cubre el navegador.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE_URL="${PAGES_URL:-https://ifee09.github.io/DrMarceloMarquez}"
BASE_URL="${BASE_URL%/}"

# Quitar trailing slash inconsistente
SHA="$(git rev-parse --short HEAD)"
BUST="$(date +%s)"

echo "refresh-pages: base=${BASE_URL} sha=${SHA}"

# Esperar a que Pages sirva el commit nuevo (máx ~3 min)
wait_for_deploy() {
  local css_url="${BASE_URL}/assets/css/styles.css"
  local i
  local ready=0
  for i in $(seq 1 24); do
    local code
    code="$(curl -sS -o /dev/null -w '%{http_code}' \
      -H 'Cache-Control: no-cache' -H 'Pragma: no-cache' \
      "${css_url}?refresh=${BUST}-${i}" || true)"
    if [[ "$code" == "200" ]]; then
      ready=$((ready + 1))
      # Un par de 200 seguidos ≈ deploy estable
      if (( ready >= 2 )); then
        echo "refresh-pages: Pages responde OK (intento ${i})"
        sleep 3
        return 0
      fi
    else
      ready=0
    fi
    echo "refresh-pages: esperando deploy… (${i}/24) http=${code:-err}"
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
    -H 'Cache-Control: max-age=0' \
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

# Recalentar también el CSS/JS con el ?v= del HTML publicado si existe
HTML_V="$(
  curl -sS -H 'Cache-Control: no-cache' "${BASE_URL}/index.html?nocache=${BUST}" \
    | python3 -c 'import re,sys; t=sys.stdin.read(); m=re.search(r"styles\.css\?v=([A-Za-z0-9]+)", t); print(m.group(1) if m else "")' \
    || true
)"
if [[ -n "${HTML_V}" ]]; then
  echo "refresh-pages: versión en HTML publicado v=${HTML_V}"
  fetch_nocache "${BASE_URL}/assets/css/styles.css?v=${HTML_V}&nocache=${BUST}"
  fetch_nocache "${BASE_URL}/assets/js/main.js?v=${HTML_V}&nocache=${BUST}"
fi

echo "refresh-pages: listo"
