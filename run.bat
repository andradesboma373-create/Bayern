@echo off
echo ==============================================
echo 🚀 MATCH SIMULATOR - LOCAL STARTUPUP SCRIPT 🚀
echo ==============================================
echo.
echo 📦 Checking Node.js dependencies...
call npm install
echo.
echo ⚙️ Starting the server and Telegram bot...
call npm run dev
pause
