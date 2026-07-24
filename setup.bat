@echo off
chcp 65001 >nul
:: ============================================================
::  НеЗабудка — скрипт установки (Windows)
::  Требует: Node.js 20+ и pnpm (или установит через winget)
:: ============================================================

echo.
echo ╔══════════════════════════════════════════╗
echo ║   НеЗабудка — установка зависимостей    ║
echo ╚══════════════════════════════════════════╝
echo.

:: ── 1. Проверить Node.js ────────────────────────────────────
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%i in ('node -v') do echo [OK] Node.js уже установлен: %%i
) else (
    echo [..] Node.js не найден. Устанавливаю через winget...
    winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    if %ERRORLEVEL% neq 0 (
        echo [!!] Winget недоступен. Скачайте Node.js вручную: https://nodejs.org/
        pause & exit /b 1
    )
    echo [OK] Node.js установлен. Перезапустите этот скрипт.
    pause & exit /b 0
)

:: ── 2. Проверить pnpm ───────────────────────────────────────
where pnpm >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%i in ('pnpm -v') do echo [OK] pnpm уже установлен: %%i
) else (
    echo [..] Устанавливаю pnpm...
    npm install -g pnpm@10
    echo [OK] pnpm установлен
)

:: ── 3. Зависимости ──────────────────────────────────────────
echo.
echo [..] Устанавливаю зависимости проекта...
call pnpm install
if %ERRORLEVEL% neq 0 (
    echo [!!] Ошибка установки зависимостей
    pause & exit /b 1
)

:: ── 4. Файл окружения ───────────────────────────────────────
if not exist .env (
    echo.
    echo [!!] Файл .env не найден. Создаю шаблон...
    (
        echo # PostgreSQL ^(замените на ваши данные^)
        echo DATABASE_URL=postgresql://user:password@localhost:5432/nezabudka
        echo.
        echo # Секрет сессии ^(любая случайная строка^)
        echo SESSION_SECRET=замените-на-длинную-случайную-строку
    ) > .env
    echo [OK] Создан .env — заполните DATABASE_URL и SESSION_SECRET
) else (
    echo [OK] .env уже существует
)

:: ── 5. Итог ─────────────────────────────────────────────────
echo.
echo ╔══════════════════════════════════════════╗
echo ║            Установка завершена!          ║
echo ╚══════════════════════════════════════════╝
echo.
echo Для запуска откройте ДВА окна командной строки:
echo.
echo   Окно 1 (API сервер):
echo     pnpm --filter @workspace/api-server run dev
echo.
echo   Окно 2 (Веб-интерфейс):
echo     pnpm --filter @workspace/smart-notes run dev
echo.
echo Затем откройте браузер: http://localhost:5173
echo.
pause
