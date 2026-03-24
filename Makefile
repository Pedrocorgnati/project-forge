# Makefile gerado por /dev-bootstrap-create (SystemForge)
.PHONY: setup reset dev build test test_all lint typecheck docker_dev docker_dev_build docker_down docker_clean seed health help

# Bootstrap targets
setup:
	@./scripts/bootstrap.sh

reset:
	@./scripts/bootstrap.sh --reset

# Development
dev:
	@npm run dev

build:
	@npm run build

# Testing
test:
	@npm run test:ci

test_all:
	@npm run test:all

# Code quality
lint:
	@npm run lint

typecheck:
	@npm run typecheck

# Docker
docker_dev:
	@npm run docker:dev

docker_dev_build:
	@npm run docker:dev:build

docker_down:
	@npm run docker:down

docker_clean:
	@npm run docker:clean

# Database
seed:
	@npm run db:seed

health:
	@./scripts/bootstrap.sh --health

# Help
help:
	@echo "Available targets:"
	@echo "  setup              - Bootstrap inicial do ambiente (recomendado)"
	@echo "  reset              - Limpa tudo e reconstrói do zero"
	@echo "  dev                - Inicia dev server (npm run dev)"
	@echo "  build              - Build de produção"
	@echo "  test               - Rodar testes (test:ci)"
	@echo "  test_all           - Todos os testes (unit + contracts + integration)"
	@echo "  lint               - ESLint"
	@echo "  typecheck          - TypeScript check"
	@echo "  docker_dev         - Sobe Docker em modo dev"
	@echo "  docker_dev_build   - Sobe Docker com rebuild"
	@echo "  docker_down        - Desce Docker"
	@echo "  docker_clean       - Desce Docker e limpa volumes"
	@echo "  seed               - Executa seeds (npm run db:seed)"
	@echo "  health             - Verifica saúde do ambiente"
	@echo ""
	@echo "Primeiro setup: make setup"
	@echo "Resetar tudo:   make reset"
	@echo "Dev server:     make dev"
