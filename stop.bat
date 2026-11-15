@echo off
echo ========================================
echo   Stopping ProductFlow (Ports 8000 & 5173)
echo ========================================

powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 8000, 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

echo.
echo ProductFlow backend and frontend have been stopped.
echo.
pause
