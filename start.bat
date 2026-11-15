@echo off
echo ========================================
echo   Starting ProductFlow Backend & Frontend
echo ========================================

start "ProductFlow Backend" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\activate && uvicorn app.main:app --reload"
start "ProductFlow Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both servers are starting in separate windows!
echo Once ready, open: http://localhost:5173
echo.
