@echo off
title Sample Tracker App for Naturin
cd /d "D:\Naturin\Sample Tracking app\sample-tracking-system"

echo ==================================================
echo        Sample Tracker App for Naturin
echo ==================================================
echo.
echo  Starting the server...
echo  The app will open in your browser shortly.
echo  (Press Ctrl+C here to STOP the app.)
echo.

REM Wait for the server to boot, then open the browser.
start "" /min cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3000"

REM Run the dev server (keeps this window open with logs).
npm run dev

echo.
echo Server stopped.
pause
