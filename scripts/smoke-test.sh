#!/bin/bash
# scripts/smoke-test.sh
# Verifica rapidamente se o ambiente está saudável após deploy
#
# Uso: ./scripts/smoke-test.sh https://projectforge.vercel.app
# Retorna exit code 0 se OK, 1 se falhou

set -e

BASE_URL="${1:-http://localhost:3000}"
TIMEOUT=10
PASS=0
FAIL=0

check() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  actual_status=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time $TIMEOUT "$url" 2>/dev/null || echo "000")

  if [ "$actual_status" = "$expected_status" ]; then
    echo "  PASS  $name ($actual_status)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name (expected $expected_status, got $actual_status)"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "Smoke Test: $BASE_URL"
echo "================================"

check "Health Check (healthz)" "$BASE_URL/api/healthz"        200
check "Health Check (health)"  "$BASE_URL/api/health"         200
check "Home / Login redirect"  "$BASE_URL/"                   200
check "404 handler"            "$BASE_URL/rota-inexistente-404" 404

echo "================================"
echo "PASS: $PASS | FAIL: $FAIL"
echo ""

if [ "$FAIL" -gt 0 ]; then
  echo "SMOKE TEST FAILED"
  exit 1
else
  echo "SMOKE TEST PASSED"
  exit 0
fi
