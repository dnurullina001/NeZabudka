#!/usr/bin/env bash
# ============================================================
#  НеЗабудка — скрипт установки (Linux / macOS / WSL)
#  Устанавливает Node.js 20, pnpm и запускает проект.
# ============================================================
set -e

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   НеЗабудка — установка зависимостей    ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Node.js ──────────────────────────────────────────────
if command -v node &>/dev/null; then
  NODE_VER=$(node -v)
  echo "✔ Node.js уже установлен: $NODE_VER"
else
  echo "⏳ Устанавливаю Node.js 20 через nvm..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  export NVM_DIR="$HOME/.nvm"
  # shellcheck disable=SC1091
  [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
  nvm install 20
  nvm use 20
  nvm alias default 20
  echo "✔ Node.js $(node -v) установлен"
fi

# ── 2. pnpm ─────────────────────────────────────────────────
if command -v pnpm &>/dev/null; then
  echo "✔ pnpm уже установлен: $(pnpm -v)"
else
  echo "⏳ Устанавливаю pnpm..."
  npm install -g pnpm@10
  echo "✔ pnpm $(pnpm -v) установлен"
fi

# ── 3. Зависимости ──────────────────────────────────────────
echo ""
echo "⏳ Устанавливаю зависимости проекта..."
pnpm install

# ── 4. Переменные окружения ──────────────────────────────────
if [ ! -f .env ]; then
  echo ""
  echo "⚠️  Файл .env не найден. Создаю шаблон..."
  cat > .env <<'ENV'
# PostgreSQL (замените на ваши данные)
DATABASE_URL=postgresql://user:password@localhost:5432/nezabudka

# Секрет сессии (любая случайная строка)
SESSION_SECRET=замените-на-длинную-случайную-строку
ENV
  echo "✔ Создан .env — заполните DATABASE_URL и SESSION_SECRET"
else
  echo "✔ .env уже существует"
fi

# ── 5. Итог ─────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║            Установка завершена!          ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Для запуска проекта:"
echo ""
echo "  # Окно 1 — API сервер:"
echo "  pnpm --filter @workspace/api-server run dev"
echo ""
echo "  # Окно 2 — Веб-интерфейс:"
echo "  pnpm --filter @workspace/smart-notes run dev"
echo ""
echo "  # Или всё вместе (если настроен turbo/concurrently):"
echo "  pnpm run dev"
echo ""
