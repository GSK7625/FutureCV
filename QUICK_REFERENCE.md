# 🚀 FutureCV - Quick Reference

Các lệnh và thông tin thường dùng cho dự án FutureCV.

---

## 🌐 URLs quan trọng

```
Frontend:       http://localhost:5173
Backend API:    http://localhost:5000
Swagger UI:     http://localhost:5000/swagger

Login:          http://localhost:5173/auth/login
Register:       http://localhost:5173/auth/register
Admin:          http://localhost:5173/admin/dashboard
Candidate:      http://localhost:5173/candidate/dashboard
HR:             http://localhost:5173/hr/dashboard
```

---

## 🔑 Demo Account

```
Email:    admin@futurecv.vn
Password: Admin@123456
```

---

## 💻 Lệnh khởi động nhanh

### Cách 1: Script tự động (Khuyên dùng)
```powershell
cd C:\Users\nglic\Downloads\Documents\cdth\FutureCV
.\start-futurecv.ps1
```

### Cách 2: Thủ công

**Backend:**
```powershell
cd C:\Users\nglic\Downloads\Documents\cdth\FutureCV\backend\src\FutureCV.Api
dotnet run
```

**Frontend:**
```powershell
cd C:\Users\nglic\Downloads\Documents\cdth\FutureCV\frontend
npm run dev
```

---

## 🛑 Dừng servers

- **Backend**: Nhấn `Ctrl+C` trong terminal backend
- **Frontend**: Nhấn `Ctrl+C` trong terminal frontend
- Hoặc đóng terminal windows

---

## 🔧 Lệnh thường dùng

### Frontend

```powershell
# Cài dependencies
npm install

# Chạy dev server
npm run dev

# Build production
npm run build

# Preview production build
npm run preview

# Type check
npx tsc --noEmit

# Clear cache
rm -r node_modules/.vite
```

### Backend

```powershell
# Chạy API
dotnet run

# Build project
dotnet build

# Clean build
dotnet clean

# Run migrations
dotnet ef database update

# Tạo migration mới
dotnet ef migrations add MigrationName

# Restore packages
dotnet restore
```

### Database

```powershell
# Khởi động PostgreSQL
Start-Service postgresql-x64-15

# Dừng PostgreSQL
Stop-Service postgresql-x64-15

# Kiểm tra status
Get-Service postgresql-x64-15

# Connect với psql
psql -U postgres -d futurecv_db
```

---

## 📁 Đường dẫn quan trọng

```
Project Root:   C:\Users\nglic\Downloads\Documents\cdth\FutureCV

Backend:        C:\Users\nglic\Downloads\Documents\cdth\FutureCV\backend
Frontend:       C:\Users\nglic\Downloads\Documents\cdth\FutureCV\frontend

Backend API:    C:\Users\nglic\Downloads\Documents\cdth\FutureCV\backend\src\FutureCV.Api
App Logic:      C:\Users\nglic\Downloads\Documents\cdth\FutureCV\backend\src\FutureCV.Application

Frontend App:   C:\Users\nglic\Downloads\Documents\cdth\FutureCV\frontend\app
Components:     C:\Users\nglic\Downloads\Documents\cdth\FutureCV\frontend\app\components
Routes:         C:\Users\nglic\Downloads\Documents\cdth\FutureCV\frontend\app\routes
Stores:         C:\Users\nglic\Downloads\Documents\cdth\FutureCV\frontend\app\stores
```

---

## 🐛 Troubleshooting nhanh

### Port đã được sử dụng

**Port 5173 (Frontend):**
```powershell
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

**Port 5000 (Backend):**
```powershell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### PostgreSQL không chạy
```powershell
# Restart service
Restart-Service postgresql-x64-15

# Hoặc start
Start-Service postgresql-x64-15
```

### Frontend không kết nối API
1. Check backend: http://localhost:5000/swagger
2. Check `.env`: `VITE_API_URL=http://localhost:5000`
3. Clear cache: `rm -r node_modules/.vite`
4. Restart dev server

### Backend database error
```powershell
# Update database
cd backend/src/FutureCV.Api
dotnet ef database update
```

---

## 📝 Files cấu hình quan trọng

### Frontend
```
/frontend/.env                    # Environment variables
/frontend/app/lib/apiClient.ts    # API configuration
/frontend/app/stores/             # State management
/frontend/vite.config.ts          # Vite config
/frontend/tailwind.config.ts      # TailwindCSS config
```

### Backend
```
/backend/src/FutureCV.Api/appsettings.json           # App settings
/backend/src/FutureCV.Api/appsettings.Development.json  # Dev settings
/backend/src/FutureCV.Api/Program.cs                 # Startup config
/backend/src/FutureCV.Infrastructure/Data/ApplicationDbContext.cs  # DbContext
```

---

## 🔐 Environment Variables

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=FutureCV
VITE_APP_VERSION=1.0.0
```

### Backend (appsettings.json)
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=futurecv_db;Username=postgres;Password=36882044"
  },
  "Jwt": {
    "Key": "your-super-secret-key-change-this-in-production-min-32-chars",
    "Issuer": "FutureCV",
    "Audience": "FutureCV-Users",
    "ExpiryInHours": 24
  }
}
```

---

## 📚 Documentation Files

```
/README.md                              # Main README
/RUNNING_FCV82.md                       # Backend setup guide
/QUICK_START.md                         # Quick start guide
/SETUP_COMPLETE.md                      # Setup completion summary
/QUICK_REFERENCE.md                     # This file

/frontend/SETUP_FRONTEND.md            # Frontend setup detailed
/frontend/FRONTEND_COMPLETE.md         # Frontend completion summary

/start-futurecv.ps1                    # Quick start script
```

---

## 🧪 Test Checklist

- [ ] Truy cập http://localhost:5173
- [ ] Xem landing page
- [ ] Click "Đăng nhập"
- [ ] Login với admin@futurecv.vn / Admin@123456
- [ ] Thấy admin dashboard
- [ ] Logout
- [ ] Register tài khoản mới
- [ ] Login với tài khoản mới
- [ ] Xem candidate/hr dashboard

---

## 🎨 Màu sắc trong code

```javascript
// TailwindCSS classes
bg-slate-900          // Background
bg-slate-800          // Card background
border-slate-700      // Borders
text-slate-50         // Primary text
text-slate-400        // Secondary text

bg-cyan-500           // Primary button
text-cyan-400         // Primary accent
bg-orange-500         // Warning/Hot
bg-green-500          // Success
bg-red-500            // Error
bg-blue-500           // Info
```

---

## 🔍 Debug Commands

### Frontend Console
```javascript
// Check auth state
console.log(useAuthStore.getState())

// Check user
console.log(useAuthStore.getState().user)

// Check token
console.log(localStorage.getItem('auth-storage'))

// Test toast
useUIStore.getState().addToast({
  type: 'success',
  message: 'Test!'
})

// Check API client
import { apiClient } from '~/lib/apiClient'
console.log(apiClient.defaults)
```

### Backend Logs
```powershell
# Xem logs trong terminal
# Hoặc check file logs (nếu có)
```

---

## 📊 Tech Stack Quick Reference

| Layer | Tech | Command |
|-------|------|---------|
| Frontend | React 19 | `npm run dev` |
| Routing | React Router 8 | - |
| Styling | TailwindCSS 4 | - |
| State | Zustand | - |
| Build | Vite 6 | `npm run build` |
| Backend | ASP.NET Core 9 | `dotnet run` |
| Database | PostgreSQL 15 | `psql -U postgres` |
| Auth | JWT | - |

---

## 🚀 Git Commands (nếu cần)

```bash
# Initialize git (nếu chưa có)
git init

# Check status
git status

# Add all changes
git add .

# Commit
git commit -m "feat: add feature name"

# Create branch
git checkout -b feature/feature-name

# Push
git push origin feature/feature-name

# Pull
git pull origin main
```

---

## ⚡ Keyboard Shortcuts

### VS Code / Cursor
```
Ctrl + `        # Toggle terminal
Ctrl + Shift+P  # Command palette
Ctrl + P        # Quick open file
Ctrl + F        # Find in file
Ctrl + Shift+F  # Find in files
Ctrl + B        # Toggle sidebar
F5              # Start debugging
```

### Browser
```
Ctrl + Shift+I  # Open DevTools
Ctrl + Shift+J  # Open Console
Ctrl + Shift+C  # Inspect element
Ctrl + R        # Refresh
Ctrl + Shift+R  # Hard refresh
F12             # Toggle DevTools
```

---

## 📞 Quick Help

### Backend không start
1. Check PostgreSQL đang chạy
2. Check connection string trong appsettings.json
3. Run `dotnet ef database update`
4. Check port 5000 có bị chiếm không

### Frontend không start
1. Run `npm install` lại
2. Clear cache: `rm -r node_modules/.vite`
3. Check port 5173 có bị chiếm không
4. Check Node.js version: `node -v` (cần v18+)

### Cannot connect to database
1. Check PostgreSQL service: `Get-Service postgresql*`
2. Start service: `Start-Service postgresql-x64-15`
3. Check connection string
4. Verify database exists: `psql -U postgres -l`

---

## 🎯 Mục tiêu tiếp theo

### Ngay lập tức
- [ ] Test toàn bộ flow (login, register, dashboard)
- [ ] Thử các tính năng đã có
- [ ] Làm quen với codebase

### Tuần tới
- [ ] Implement job search page
- [ ] Add job posting form
- [ ] Connect real API endpoints
- [ ] Add file upload

### Tháng tới
- [ ] Complete all CRUD operations
- [ ] Add real-time features
- [ ] Implement notifications
- [ ] Add tests

---

**Lưu file này để tham khảo nhanh! 📌**

---

**Last Updated**: Sep 6, 2026  
**Version**: 1.0.0
