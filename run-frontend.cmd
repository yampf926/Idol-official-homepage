@echo off
setlocal

set "ROOT=%~dp0"
set "FRONTEND=%ROOT%frontend"
set "VITE=%FRONTEND%\node_modules\vite\bin\vite.js"
set "CODEX_NODE=%LOCALAPPDATA%\OpenAI\Codex\bin\5b9024f90663758b\node.exe"
set "NODE="

where node >nul 2>nul
if %errorlevel%==0 (
  set "NODE=node"
)

if not defined NODE if exist "%CODEX_NODE%" (
  set "NODE=%CODEX_NODE%"
)

if not defined NODE (
  echo Node.js was not found.
  echo Install Node.js or configure the IntelliJ Node interpreter.
  exit /b 1
)

if not exist "%VITE%" (
  echo Vite was not found: %VITE%
  echo Run npm install in the frontend directory first.
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing 'http://localhost:5173/' -TimeoutSec 1; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } } catch { exit 1 }"
if %errorlevel%==0 (
  echo Frontend is already running:
  echo http://localhost:5173/
  exit /b 0
)

cd /d "%FRONTEND%"
"%NODE%" "%VITE%" --host localhost --port 5173
