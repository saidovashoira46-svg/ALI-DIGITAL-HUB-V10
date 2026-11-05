@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ALI DIGITAL HUB V9 — loyiha UI maketlari bilan...
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js o'rnatilmagan. https://nodejs.org dan LTS o'rnating.
 pause
 exit /b 1
)
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"
npm start
pause
