#!/usr/bin/env bash
# bootstrap.sh — Setup completo do ambiente local
# Gerado por /dev-bootstrap-create (SystemForge)
# Uso: ./scripts/bootstrap.sh [--reset]
set -euo pipefail

# === Cores ===
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${BLUE}[bootstrap]${NC} $*"; }
ok()   { echo -e "${GREEN}[ok]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[erro]${NC} $*" >&2; }

# === Pre-requisitos ===
check_prereqs() {
  local missing=()

  command -v git >/dev/null 2>&1 || missing+=("git")
  command -v node >/dev/null 2>&1 || missing+=("node")
  command -v npm >/dev/null 2>&1 || missing+=("npm")
  command -v docker >/dev/null 2>&1 || missing+=("docker")

  if [ ${#missing[@]} -gt 0 ]; then
    err "Faltando: ${missing[*]}"
    err "Instale os pre-requisitos acima e tente novamente."
    exit 1
  fi
  ok "Pre-requisitos verificados"
}

# === .env ===
ensure_env() {
  if [ -f .env ]; then
    ok ".env já existe"
    return
  fi

  if [ -f .env.example ]; then
    cp .env.example .env
    ok ".env criado a partir de .env.example"
    warn "Revise .env e preencha valores sensíveis antes de continuar"
    return
  fi

  warn ".env não encontrado e sem template. Crie manualmente ou execute /env-creation"
}

# === Dependências ===
install_deps() {
  log "Instalando dependências..."
  npm ci
  ok "Dependências instaladas"
}

# === Docker ===
start_services() {
  log "Subindo serviços Docker..."
  docker compose up -d
  log "Aguardando health checks..."

  # Esperar até 60s pelos serviços ficarem healthy
  local max_wait=60
  local waited=0
  while [ $waited -lt $max_wait ]; do
    if docker compose ps --format json 2>/dev/null | grep -q '"Health":"healthy"' || \
       docker compose ps 2>/dev/null | grep -q "(healthy)"; then
      break
    fi
    sleep 2
    waited=$((waited + 2))
  done

  if [ $waited -ge $max_wait ]; then
    warn "Timeout esperando serviços ficarem healthy (${max_wait}s)"
    warn "Verifique com: docker compose ps"
  else
    ok "Serviços Docker rodando"
  fi
}

stop_services() {
  log "Parando serviços Docker..."
  docker compose down
  ok "Serviços parados"
}

# === Migrations ===
run_migrations() {
  log "Executando migrations..."
  npx prisma migrate deploy
  ok "Migrations aplicadas"
}

# === Seeds ===
run_seeds() {
  log "Executando seeds..."
  npm run db:seed
  ok "Seeds aplicados"
}

# === Health Check (leve) ===
check_health() {
  log "Verificando saúde do ambiente..."
  local errors=0

  # Verificar .env
  if [ -f .env ]; then
    ok ".env presente"
  else
    warn ".env ausente"
    errors=$((errors + 1))
  fi

  # Verificar containers
  if docker compose ps --status running 2>/dev/null | grep -q "running"; then
    ok "Containers rodando"
  else
    warn "Containers não estão rodando"
    errors=$((errors + 1))
  fi

  # Verificar node_modules
  if [ -d node_modules ]; then
    ok "node_modules presente"
  else
    warn "node_modules ausente"
    errors=$((errors + 1))
  fi

  if [ $errors -eq 0 ]; then
    ok "Ambiente saudável ✓"
    return 0
  else
    warn "$errors problema(s) encontrado(s) — verifique acima"
    return 1
  fi
}

# === Resumo ===
show_summary() {
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  BOOTSTRAP COMPLETO${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "  Para iniciar o dev server:"
  echo "    npm run dev   (ou: make dev)"
  echo ""
  echo "  Para parar serviços:"
  echo "    docker compose down   (ou: make down)"
  echo ""
  echo "  Para rodar testes:"
  echo "    npm run test:ci   (ou: make test)"
  echo ""
  echo "  Para resetar tudo:"
  echo "    ./scripts/bootstrap.sh --reset   (ou: make reset)"
  echo ""
  echo "  Para abrir Prisma Studio:"
  echo "    docker compose --profile tools run prisma"
  echo ""
}

# === Reset ===
do_reset() {
  warn "Resetando ambiente..."
  docker compose down -v 2>/dev/null || true
  rm -rf node_modules .next dist build __pycache__ .venv 2>/dev/null || true
  rm -f .env 2>/dev/null || true
  ok "Ambiente limpo"
  do_setup
}

# === Setup principal ===
do_setup() {
  log "Iniciando bootstrap de project-forge..."
  echo ""

  check_prereqs
  ensure_env
  install_deps
  start_services
  run_migrations
  run_seeds
  check_health
  show_summary
}

# === Entrypoint ===
cd "$(dirname "$0")/.."

case "${1:-}" in
  --reset) do_reset ;;
  --health) check_health ;;
  *) do_setup ;;
esac
