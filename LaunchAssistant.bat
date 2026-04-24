@echo off
title GenAI Research Assistant - Production Launcher
echo ==========================================================
echo    🚀 STARTING GENAI RESEARCH ASSISTANT PLATFORM 🚀
echo ==========================================================
echo.
echo [1/2] Initializing AI Brain (Python Backend)...
echo (This may take 30-60 seconds on first run. DO NOT CANCEL!)
echo.

start "Backend Server" cmd /c "python server.py"

echo [2/2] Launching Dashboard (React Frontend)...
cd frontend
start "Frontend Dashboard" cmd /c "npm run dev"

echo.
echo ==========================================================
echo ✅ ALL SYSTEMS DEPLOYING!
echo ----------------------------------------------------------
echo 1. Wait for the 'Initializing AI Brain' message to finish.
echo 2. Your frontend will be at: http://localhost:5173
echo 3. The backend API is at: http://127.0.0.1:8000
echo ==========================================================
echo.
pause
