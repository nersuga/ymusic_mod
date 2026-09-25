@echo off
rem Re-installs the Yandex Music mod (e.g. after installing the app manually). Closes and restarts the app.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0watch-update.ps1" -Mode repair %*
pause
