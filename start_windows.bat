@echo off
setlocal enabledelayedexpansion
title TMC Graduation Bus System

echo ========================================================
echo    Graduation Bus System - Port 5001
echo ========================================================
echo.

:: 1. Navigate to the directory of this batch file
cd /d "%~dp0"

:: 2. Check if we need to enter 'server' subfolder
if exist "server\dist\index.js" (
    cd server
) else if not exist "dist\index.js" (
    echo [ERROR] Cannot find 'server' directory or 'dist\index.js'!
    echo Current path: %cd%
    pause
    exit /b 1
)

:: 3. Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js (LTS version) from: https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: 4. Ensure .env file exists
if not exist ".env" (
    echo [INFO] Creating default .env configuration...
    echo PORT=5001> .env
    echo NODE_ENV=production>> .env
    echo JWT_SECRET=tmc-military-tech-college-secret-key-2026>> .env
    echo DATABASE_URL="file:./dev.db">> .env
)

:: 5. Install dependencies if node_modules is missing
if not exist "node_modules\" (
    echo [INFO] Installing server dependencies...
    call npm install
)

:: 6. Generate Prisma client for Windows
echo [INFO] Generating database engine for Windows...
call npx prisma generate

:: 7. Initialize database if dev.db does not exist
if not exist "dev.db" (
    echo [INFO] First time setup: Initializing SQLite database...
    call npx prisma db push
    call npx tsx prisma/seed.ts
)

:: 8. Launch browser
echo [INFO] Opening browser at http://localhost:5001 ...
start http://localhost:5001

:: 9. Start the server
echo.
echo ========================================================
echo [SUCCESS] System is now running on: http://localhost:5001
echo.
echo Default Login Credentials:
echo   Username: admin
echo   Password: admin123
echo.
echo NOTE: Keep this terminal window OPEN while using the system.
echo To stop the system, simply close this window.
echo ========================================================
echo.

call node dist/index.js

pause
