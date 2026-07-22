# run_project.ps1
# Automated startup script for Smart Credit AI (Backend & Frontend)

Write-Host "🚀 Starting Smart Credit AI System..." -ForegroundColor Green

# 1. Start FastAPI Backend in a new window
Write-Host "📦 Starting FastAPI Backend (Port 8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "conda activate oracle_api_env; cd backend; python main.py"

# 2. Start React Frontend in a new window
Write-Host "💻 Starting React Frontend (Port 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm install; npm run dev"

Write-Host "✅ Backend and Frontend processes launched successfully!" -ForegroundColor Green
