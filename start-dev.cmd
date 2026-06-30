@echo off
set ROOT=%~dp0

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\start-dev.ps1"

echo.
echo DOHWA development servers are starting.
echo Open http://localhost:412/ after the frontend window shows the Local URL.
echo.
pause
