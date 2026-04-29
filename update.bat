@echo off
cd /d "%~dp0"
git add .
git commit -m "Update: %date%"
git push origin main
pause
