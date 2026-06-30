@echo off
set NODE_HOME=%~dp0tools\node-v24.16.0-win-x64
set PATH=%NODE_HOME%;%NODE_HOME%\node_modules\npm\bin;%PATH%
"%NODE_HOME%\npm.cmd" %*
