# FutureCV - Start Full Stack Application
# This script starts both backend and frontend servers

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FutureCV - Full Stack Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Define paths
$BackendPath = "C:\Users\nglic\Downloads\Documents\cdth\FutureCV\backend\src\FutureCV.Api"
$FrontendPath = "C:\Users\nglic\Downloads\Documents\cdth\FutureCV\frontend"

# Check if paths exist
if (-not (Test-Path $BackendPath)) {
    Write-Host "❌ Backend path not found: $BackendPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $FrontendPath)) {
    Write-Host "❌ Frontend path not found: $FrontendPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Paths verified" -ForegroundColor Green
Write-Host ""

# Function to start backend
function Start-Backend {
    Write-Host "🚀 Starting Backend API..." -ForegroundColor Yellow
    Write-Host "   Path: $BackendPath" -ForegroundColor Gray
    Write-Host "   URL: http://localhost:5000" -ForegroundColor Gray
    Write-Host ""
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BackendPath'; dotnet run"
    Start-Sleep -Seconds 2
}

# Function to start frontend
function Start-Frontend {
    Write-Host "🎨 Starting Frontend..." -ForegroundColor Yellow
    Write-Host "   Path: $FrontendPath" -ForegroundColor Gray
    Write-Host "   URL: http://localhost:5173" -ForegroundColor Gray
    Write-Host ""
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FrontendPath'; npm run dev"
    Start-Sleep -Seconds 2
}

# Start both servers
try {
    Start-Backend
    Start-Frontend
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ Both servers are starting!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📍 Backend API:  http://localhost:5000" -ForegroundColor Cyan
    Write-Host "📍 Swagger UI:   http://localhost:5000/swagger" -ForegroundColor Cyan
    Write-Host "📍 Frontend:     http://localhost:5173" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔐 Demo Account:" -ForegroundColor Yellow
    Write-Host "   Email:    admin@futurecv.vn" -ForegroundColor Gray
    Write-Host "   Password: Admin@123456" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 Tip: Two new PowerShell windows have opened." -ForegroundColor Magenta
    Write-Host "   Press Ctrl+C in each window to stop the servers." -ForegroundColor Magenta
    Write-Host ""
    
    # Wait a bit before opening browser
    Write-Host "⏳ Waiting 5 seconds before opening browser..." -ForegroundColor Gray
    Start-Sleep -Seconds 5
    
    # Open browser
    Write-Host "🌐 Opening browser..." -ForegroundColor Green
    Start-Process "http://localhost:5173"
    
    Write-Host ""
    Write-Host "✨ Setup complete! Happy coding!" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "❌ Error starting servers: $_" -ForegroundColor Red
    exit 1
}
