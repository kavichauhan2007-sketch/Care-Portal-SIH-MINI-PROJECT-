@echo off
REM CarePortal Setup Script for Windows
REM This script automates the initial setup of the CarePortal application

echo.
echo ============================================
echo   CarePortal Setup Script (Windows)
echo ============================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js detected: 
node -v

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
)

echo [OK] npm detected:
npm -v
echo.

REM Check if .env.local exists
if not exist ".env.local" (
    echo [WARNING] .env.local not found
    echo Creating from .env.example...
    copy .env.example .env.local
    echo [OK] Created .env.local
    echo.
    echo [IMPORTANT] Edit .env.local with your actual credentials:
    echo   - NEXT_PUBLIC_SUPABASE_URL
    echo   - NEXT_PUBLIC_SUPABASE_ANON_KEY
    echo   - SUPABASE_SERVICE_ROLE_KEY
    echo   - GEMINI_API_KEY
    echo.
    pause
)

echo Installing dependencies...
echo.

REM Install root dependencies
echo Installing root dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install root dependencies
    pause
    exit /b 1
)

REM Install patient kiosk dependencies
echo Installing patient kiosk dependencies...
cd apps\patient-kiosk
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install patient kiosk dependencies
    pause
    exit /b 1
)
cd ..\..

echo [OK] Dependencies installed
echo.

REM Create directory structure
echo Creating directory structure...

if not exist "apps\patient-kiosk\components\ui" mkdir apps\patient-kiosk\components\ui
if not exist "apps\patient-kiosk\components\patient" mkdir apps\patient-kiosk\components\patient
if not exist "apps\patient-kiosk\components\3d" mkdir apps\patient-kiosk\components\3d
if not exist "apps\patient-kiosk\components\forms" mkdir apps\patient-kiosk\components\forms
if not exist "apps\patient-kiosk\hooks" mkdir apps\patient-kiosk\hooks
if not exist "apps\patient-kiosk\services" mkdir apps\patient-kiosk\services
if not exist "apps\patient-kiosk\store" mkdir apps\patient-kiosk\store
if not exist "apps\patient-kiosk\i18n" mkdir apps\patient-kiosk\i18n
if not exist "apps\patient-kiosk\app\api" mkdir apps\patient-kiosk\app\api
if not exist "apps\patient-kiosk\app\(patient)" mkdir "apps\patient-kiosk\app\(patient)"
if not exist "apps\patient-kiosk\public\uploads" mkdir apps\patient-kiosk\public\uploads

echo [OK] Directory structure created
echo.

REM Check Supabase configuration
echo Checking Supabase configuration...
findstr /C:"your_supabase" .env.local >nul 2>nul
if %errorlevel% equ 0 (
    echo [WARNING] Supabase credentials not configured in .env.local
    echo.
    echo Next steps:
    echo 1. Create a Supabase project at https://supabase.com
    echo 2. Update .env.local with your Supabase credentials
    echo 3. Run the database schema from database\schema.sql
    echo 4. Run the seed data from database\seed\seed.sql
    echo.
) else (
    echo [OK] Supabase configuration found
)

echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo Next steps:
echo.
echo 1. Configure Supabase:
echo    - Run database\schema.sql in Supabase SQL Editor
echo    - Run database\seed\seed.sql for demo data
echo.
echo 2. Get Google Gemini API key:
echo    - Visit https://makersuite.google.com/app/apikey
echo    - Add to .env.local as GEMINI_API_KEY
echo.
echo 3. Start development server:
echo    npm run dev:patient
echo.
echo 4. Visit http://localhost:3000
echo.
echo For detailed instructions, see:
echo    - QUICK_START.md
echo    - STATUS.md
echo    - IMPLEMENTATION_GUIDE.md
echo.
echo Happy coding!
echo.
pause
