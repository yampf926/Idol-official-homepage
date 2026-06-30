@echo off
setlocal

set "ROOT=%~dp0"
set "MVNW=%ROOT%mvnw.cmd"

if not exist "%MVNW%" (
  echo Maven wrapper was not found: %MVNW%
  exit /b 1
)

cd /d "%ROOT%"
call "%MVNW%" spring-boot:run
