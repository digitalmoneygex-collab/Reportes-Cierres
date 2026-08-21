@echo off
title Conector PSKLOUD
echo Iniciando sincronizador de PSKLOUD...
echo.
cd /d "%~dp0"
node sync-pskloud.js --watch
pause
