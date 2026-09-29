@echo off
rem Starts the price server (port 8787) and the web app (port 5173).
cd /d "%~dp0"
if not exist server\.venv (
  python -m venv server\.venv
  server\.venv\Scripts\python -m pip install -r server\requirements.txt
)
if not exist node_modules call npm install
start "Investor RPG price server" /d server cmd /k ".venv\Scripts\python -m uvicorn app:app --port 8787"
start "" http://localhost:5173
npm run dev
