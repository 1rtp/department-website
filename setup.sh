#!/usr/bin/env bash
# ═══════════════════════════════════════════════
#  Кафедра КН та ІТ — Встановлення (Mac / Linux)
# ═══════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_ENV="$BACKEND_DIR/.env"
FRONTEND_ENV="$FRONTEND_DIR/.env"

# ── Кольори ───────────────────────────────────
BLUE='\033[1;34m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
RED='\033[1;31m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

# ── Хедер ─────────────────────────────────────
clear
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${BLUE}║${RESET}   🎓  ${BOLD}Кафедра КН та ІТ${RESET}                        ${BLUE}║${RESET}"
echo -e "${BLUE}║${RESET}   ${DIM}Автоматичне встановлення залежностей${RESET}        ${BLUE}║${RESET}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${RESET}"
echo ""

step() {
  echo -e "${BLUE}▶  ${BOLD}$1...${RESET}"
}

ok() {
  echo -e "${GREEN}✓  $1${RESET}"
}

warn() {
  echo -e "${YELLOW}⚠  $1${RESET}"
}

error() {
  echo -e "${RED}❌  $1${RESET}"
  exit 1
}

# ── Перевірка оточення ────────────────────────
step "Перевірка системних вимог"

if ! command -v python3 &> /dev/null; then
  error "Python 3 не знайдено! Будь ласка, встановіть Python."
fi
ok "Python знайдено: $(python3 --version)"

if ! command -v node &> /dev/null; then
  error "Node.js не знайдено! Будь ласка, встановіть Node.js."
fi
ok "Node.js знайдено: $(node --version)"

echo ""

# ── Крок 1: БЕКЕНД ────────────────────────────
step "1. Встановлення Python пакетів (backend)"
if [ -d "$BACKEND_DIR" ]; then
  cd "$BACKEND_DIR"
  python3 -m pip install -r requirements.txt
  ok "Python залежності встановлено"
else
  error "Папку backend не знайдено за шляхом $BACKEND_DIR"
fi
echo ""

# ── Крок 2: ФРОНТЕНД ──────────────────────────
step "2. Встановлення Node.js пакетів (frontend)"
if [ -d "$FRONTEND_DIR" ]; then
  cd "$FRONTEND_DIR"
  if command -v yarn &> /dev/null; then
    ok "Знайдено yarn, запускаємо yarn install..."
    yarn install
  else
    warn "yarn не знайдено, використовуємо npm install..."
    npm install
  fi
  ok "Залежності фронтенду встановлено"
else
  error "Папку frontend не знайдено за шляхом $FRONTEND_DIR"
fi
echo ""

# ── Крок 3: КОНФІГУРАЦІЯ ──────────────────────
step "3. Створення конфігураційних файлів .env"

if [ -f "$BACKEND_ENV" ]; then
  warn "backend/.env вже існує — пропущено"
else
  cat > "$BACKEND_ENV" <<'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=kafedra_db
CORS_ORIGINS=http://localhost:3000
SMTP_PASSWORD=
EOF
  ok "backend/.env створено"
fi

if [ -f "$FRONTEND_ENV" ]; then
  warn "frontend/.env вже існує — пропущено"
else
  cat > "$FRONTEND_ENV" <<'EOF'
REACT_APP_BACKEND_URL=http://localhost:8000
EOF
  ok "frontend/.env створено"
fi

echo ""

# ── Підсумок ──────────────────────────────────
echo -e "${GREEN}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${GREEN}║${RESET}   ✅  ${BOLD}Встановлення завершено успішно!${RESET}         ${GREEN}║${RESET}\""
echo -e "${GREEN}╚══════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "${BOLD}Наступні кроки:${RESET}"
echo ""
echo -e "  ${DIM}1.${RESET} Якщо потрібна пошта — заповніть ${YELLOW}SMTP_PASSWORD${RESET} у ${YELLOW}backend/.env${RESET}"
echo ""
echo -e "  ${DIM}2.${RESET} Запустіть ${BOLD}бекенд${RESET}:"
echo -e "     ${DIM}cd backend && uvicorn server:app --reload${RESET}"
echo ""
echo -e "  ${DIM}3.${RESET} Запустіть ${BOLD}фронтенд${RESET}:"
echo -e "     ${DIM}cd frontend && yarn start${RESET}  ${DIM}(або npm start)${RESET}"
echo ""
echo -e "  ${DIM}4.${RESET} Відкрийте в браузері: ${BLUE}http://localhost:3000${RESET}"
echo ""
echo -e "  ${DIM}5.${RESET} ${YELLOW}${BOLD}Кастомний порт MongoDB:${RESET}"
echo -e "     Якщо ви зміните порт у ${YELLOW}MONGO_URL${RESET} (наприклад, на 27020), обов'язково"
echo -e "     створіть папку на диску та запустіть базу в окремому терміналі:"
echo -e "     ${BOLD}mongod --port 27020 --dbpath \"/ваш/шлях/до/папки\"${RESET}"
echo ""