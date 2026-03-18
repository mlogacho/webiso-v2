#!/bin/bash
# =============================================================================
# scripts/setup.sh — Quick environment recovery for WebISO v2
# DataCom S.A.
#
# Usage: bash scripts/setup.sh
#
# This script:
#   1. Verifies Python 3+ is installed
#   2. Creates the virtual environment if it does not exist
#   3. Activates the virtual environment
#   4. Installs Python dependencies from requirements.txt
#   5. Installs Node.js dependencies (npm install)
#   6. Verifies that .env exists (copies .env.example if missing)
#   7. Prompts the user to build the frontend
#   8. Prints the commands to start development servers
# =============================================================================

set -euo pipefail

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── 0. Move to project root ───────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"
info "Working directory: $PROJECT_ROOT"

# ── 1. Verify Python 3 ───────────────────────────────────────────────────────
info "Checking Python installation..."
PYTHON_BIN="${PYTHON_BIN:-python3}"

if ! command -v "$PYTHON_BIN" &>/dev/null; then
    error "Python 3 not found. Install Python 3.10+ and re-run this script."
fi

PYTHON_VERSION=$("$PYTHON_BIN" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
PYTHON_MAJOR=$(echo "$PYTHON_VERSION" | cut -d. -f1)
if [[ "$PYTHON_MAJOR" -lt 3 ]]; then
    error "Python 3 required. Found: Python $PYTHON_VERSION"
fi
success "Python $PYTHON_VERSION found."

# ── 2. Create virtual environment ────────────────────────────────────────────
VENV_DIR="$PROJECT_ROOT/venv"
if [[ ! -d "$VENV_DIR" ]]; then
    info "Creating virtual environment at venv/..."
    "$PYTHON_BIN" -m venv "$VENV_DIR"
    success "Virtual environment created."
else
    info "Virtual environment already exists. Skipping creation."
fi

# ── 3. Activate virtual environment ──────────────────────────────────────────
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
success "Virtual environment activated."

# ── 4. Install Python dependencies ───────────────────────────────────────────
if [[ -f "requirements.txt" ]]; then
    info "Installing Python dependencies..."
    pip install --upgrade pip --quiet
    pip install -r requirements.txt --quiet
    success "Python dependencies installed."
else
    warn "requirements.txt not found. Skipping Python dependency installation."
fi

# ── 5. Install Node.js dependencies ──────────────────────────────────────────
if command -v node &>/dev/null; then
    NODE_VERSION=$(node --version)
    info "Node.js $NODE_VERSION found."
    if [[ -f "package.json" ]]; then
        info "Installing Node.js dependencies..."
        npm install --silent
        success "Node.js dependencies installed."
    fi
else
    warn "Node.js not found. Skipping frontend dependency installation."
    warn "Install Node.js 20 LTS to build the React frontend."
fi

# ── 6. Verify .env file ───────────────────────────────────────────────────────
if [[ ! -f ".env" ]]; then
    if [[ -f ".env.example" ]]; then
        cp .env.example .env
        warn ".env file not found. Copied from .env.example."
        warn "IMPORTANT: Edit .env with real values before starting the server."
    else
        warn ".env and .env.example not found. Create .env manually."
    fi
else
    success ".env file exists."
fi

# ── 7. Optional: build the frontend ──────────────────────────────────────────
echo ""
read -r -p "$(echo -e "${YELLOW}Build the React frontend now? (y/N):${NC} ")" BUILD_FRONTEND
if [[ "${BUILD_FRONTEND,,}" == "y" ]]; then
    if command -v npm &>/dev/null; then
        info "Building React frontend (npm run build)..."
        npm run build
        success "Frontend built successfully. Output: dist/"
    else
        warn "npm not available. Skipping frontend build."
    fi
fi

# ── 8. Success message ────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}  WebISO v2 — Environment ready!${NC}"
echo -e "${GREEN}============================================================${NC}"
echo ""
echo -e "  Start the ${BLUE}Flask backend${NC}:"
echo -e "    source venv/bin/activate && python app.py"
echo ""
echo -e "  Start the ${BLUE}React frontend${NC} (development):"
echo -e "    npm run dev"
echo ""
echo -e "  ${YELLOW}Remember:${NC} edit .env before starting in production."
echo ""
