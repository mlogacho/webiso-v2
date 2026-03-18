# Makefile — WebISO v2
# DataCom S.A.
# Usage: make <target>

PYTHON     := python3
VENV       := venv
VENV_BIN   := $(VENV)/bin
PIP        := $(VENV_BIN)/pip
FLASK      := $(VENV_BIN)/python
GUNICORN   := $(VENV_BIN)/gunicorn

.DEFAULT_GOAL := help

# ── Help ──────────────────────────────────────────────────────────────────────
.PHONY: help
help:
	@echo ""
	@echo "  WebISO v2 — Available commands"
	@echo "  ────────────────────────────────────────────────────────"
	@echo "  make setup     Configure environment (venv + deps + .env)"
	@echo "  make run       Start Flask development server"
	@echo "  make dev       Start React frontend (Vite dev server)"
	@echo "  make build     Build React frontend for production"
	@echo "  make test      Run test suite"
	@echo "  make freeze    Update requirements.txt from current venv"
	@echo "  make clean     Remove cache, build artifacts and temp files"
	@echo "  make deploy    Build frontend and sync to production server"
	@echo "  ────────────────────────────────────────────────────────"
	@echo ""

# ── Setup ─────────────────────────────────────────────────────────────────────
.PHONY: setup
setup:
	bash scripts/setup.sh

# ── Backend — Flask development server ───────────────────────────────────────
.PHONY: run
run:
	@if [ ! -d "$(VENV)" ]; then \
		echo "[ERROR] Virtual environment not found. Run: make setup"; \
		exit 1; \
	fi
	$(FLASK) app.py

# ── Frontend — Vite development server ───────────────────────────────────────
.PHONY: dev
dev:
	npm run dev

# ── Frontend — Production build ───────────────────────────────────────────────
.PHONY: build
build:
	npm run build

# ── Tests ─────────────────────────────────────────────────────────────────────
.PHONY: test
test:
	@if [ ! -d "$(VENV)" ]; then \
		echo "[ERROR] Virtual environment not found. Run: make setup"; \
		exit 1; \
	fi
	@if [ -d "tests" ] && [ -n "$$(ls -A tests/*.py 2>/dev/null)" ]; then \
		$(VENV_BIN)/pytest tests/ -v; \
	else \
		echo "[INFO] No tests found in tests/. Add test files and re-run."; \
	fi

# ── Freeze requirements ───────────────────────────────────────────────────────
.PHONY: freeze
freeze:
	@if [ ! -d "$(VENV)" ]; then \
		echo "[ERROR] Virtual environment not found. Run: make setup"; \
		exit 1; \
	fi
	$(PIP) freeze > requirements.txt
	@echo "[OK] requirements.txt updated."

# ── Clean ─────────────────────────────────────────────────────────────────────
.PHONY: clean
clean:
	find . -type d -name "__pycache__" -not -path "./.git/*" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -not -path "./.git/*" -delete 2>/dev/null || true
	find . -type f -name "*.pyo" -not -path "./.git/*" -delete 2>/dev/null || true
	rm -rf dist/ .vite/ .pytest_cache/ htmlcov/ .coverage coverage.xml
	@echo "[OK] Cleaned build artifacts and cache files."

# ── Deploy ────────────────────────────────────────────────────────────────────
.PHONY: deploy
deploy: build
	bash scripts/deploy_webiso.sh
