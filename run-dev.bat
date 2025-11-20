@echo off
title Drone Station - DEV

REM ==== Проверяем установлен ли Node ====
node -v >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js не найден.
    echo Установите Node.js с сайта https://nodejs.org/ и попробуйте снова.
    pause
    exit /b
)

REM ==== Переходим в папку скрипта ====
cd /d "%~dp0"

REM ==== Проверяем node_modules ====
if not exist "node_modules" (
    echo Устанавливаем зависимости...
    npm install
)

echo.
echo ==== Запускаем проект ====
npm run dev

echo.
echo Сервер остановлен. Нажмите любую клавишу для выхода.
pause >nul
