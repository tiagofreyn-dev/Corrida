@echo off
cd /d "%~dp0"
start "Planilha-Corrida" /min cmd /c "npm run dev -- --host --port 5173 > dev-server.log 2>&1"
timeout /t 5 /nobreak >nul
start http://localhost:5173/
echo App aberto em http://localhost:5173/ - nao feche a janela "Planilha-Corrida" enquanto usar.
pause
