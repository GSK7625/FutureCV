# 🚀 FutureCV - Hệ thống Tuyển dụng Thông minh

Nền tảng tuyển dụng hiện đại kết nối nhà tuyển dụng với ứng viên tiềm năng một cách nhanh chóng và hiệu quả.

---

## 📋 Tổng quan

FutureCV là một hệ thống tuyển dụng full-stack được xây dựng với công nghệ hiện đại:

- **Backend**: ASP.NET Core 9 + PostgreSQL
- **Frontend**: React 19 + React Router v8 + TailwindCSS 4
- **Authentication**: JWT-based với role-based access control
- **API Documentation**: Swagger/OpenAPI

---

## ✨ Tính năng chính

### Cho Ứng viên (Candidate)
- 🔍 Tìm kiếm công việc phù hợp
- 📝 Nộp hồ sơ ứng tuyển trực tuyến
- 📊 Theo dõi trạng thái ứng tuyển
- 👤 Quản lý hồ sơ cá nhân
- 📅 Xem lịch phỏng vấn
- 📈 Theo dõi profile views

### Cho Nhà tuyển dụng (HR)
- 📢 Đăng tin tuyển dụng
- 📋 Quản lý hồ sơ ứng viên
- 📅 Lên lịch phỏng vấn
- 📊 Phân tích hiệu suất tuyển dụng
- 💬 Giao tiếp với ứng viên
- 📈 Theo dõi recruitment metrics

### Cho Quản trị viên (Admin)
- 👥 Quản lý người dùng
- 💼 Quản lý công việc
- 📊 Xem báo cáo tổng quan
- ⚙️ Cấu hình hệ thống
- 🔍 Giám sát hoạt động
- 📈 Analytics dashboard

---

## 🏗️ Kiến trúc hệ thống

```
FutureCV/
├── backend/               # ASP.NET Core API
│   ├── src/
│   │   ├── FutureCV.Api          # API layer
│   │   ├── FutureCV.Application  # Business logic
│   │   ├── FutureCV.Domain       # Domain models
│   │   └── FutureCV.Infrastructure # Data access
│   └── tests/
│
├── frontend/             # React SPA
│   ├── app/
│   │   ├── components/
│   │   ├── routes/
│   │   ├── stores/
│   │   ├── lib/
│   │   └── types/
│   └── public/
│
├── start-futurecv.ps1   # Quick start script
├── RUNNING_FCV82.md     # Backend setup guide
└── README.md            # This file
```

---

## 🚀 Quick Start

### Yêu cầu hệ thống

- **Node.js**: v18+ (khuyên dùng v24)
- **.NET SDK**: 9.0+
- **PostgreSQL**: 15+
- **OS**: Windows 10/11

### Cách 1: Sử dụng script tự động (Khuyên dùng)

```powershell
# Clone project
cd C:\Users\nglic\Downloads\Documents\cdth\FutureCV

# Chạy script tự động
.\start-futurecv.ps1
```

Script sẽ tự động:
1. ✅ Start backend API (http://localhost:5000)
2. ✅ Start frontend (http://localhost:5173)
3. ✅ Mở browser tự động
4. ✅ Hiển thị thông tin đăng nhập demo

### Cách 2: Chạy thủ công

#### Backend

```powershell
# Terminal 1 - Backend
cd C:\Users\nglic\Downloads\Documents\cdth\FutureCV\backend\src\FutureCV.Api
dotnet run
```

#### Frontend

```powershell
# Terminal 2 - Frontend
cd C:\Users\nglic\Downloads\Documents\cdth\FutureCV\frontend
npm run dev
```

---

## 🌐 Truy cập ứng dụng

### URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Swagger UI**: http://localhost:5000/swagger

### Tài khoản Demo

#### Admin
```
Email:    admin@futurecv.vn
Password: Admin@123456
URL:      http://localhost:5173/admin/dashboard
```

#### Candidate/HR
Đăng ký tài khoản mới tại: http://localhost:5173/auth/register

---

## 🛠️ Stack công nghệ

### Backend

| Công nghệ | Version | Mục đích |
|-----------|---------|----------|
| ASP.NET Core | 9.0 | Web API framework |
| Entity Framework Core | 9.0 | ORM |
| PostgreSQL | 15+ | Database |
| JWT | - | Authentication |
| Swagger | - | API documentation |
| FluentValidation | - | Input validation |
| AutoMapper | - | Object mapping |

### Frontend

| Công nghệ | Version | Mục đích |
|-----------|---------|----------|
| React | 19 | UI library |
| React Router | 8 | Routing |
| TypeScript | 5+ | Type safety |
| Vite | 6 | Build tool |
| TailwindCSS | 4 | Styling |
| Zustand | - | State management |
| Axios | - | HTTP client |
| TanStack Query | - | Server state |

---

## 📱 Screenshots & Pages

### Public Pages
- ✅ Landing page với hero section
- ✅ About page
- ✅ Login page
- ✅ Register page

### Dashboards
- ✅ Admin dashboard - System overview & monitoring
- ✅ Candidate dashboard - Job search & applications
- ✅ HR dashboard - Recruitment management

### Đã implement
- Toast notification system
- Loading states
- Protected routes
- Role-based access control
- Responsive design
- Dark theme

---

## 📂 Project Structure

### Backend (Clean Architecture)

```
backend/
├── src/
│   ├── FutureCV.Api/
│   │   ├── Controllers/      # API endpoints
│   │   ├── Middleware/       # Custom middleware
│   │   └── Program.cs        # App configuration
│   │
│   ├── FutureCV.Application/
│   │   ├── Services/         # Business logic
│   │   ├── DTOs/            # Data transfer objects
│   │   └── Interfaces/       # Service interfaces
│   │
│   ├── FutureCV.Domain/
│   │   ├── Entities/        # Domain models
│   │   └── Enums/           # Enumerations
│   │
│   └── FutureCV.Infrastructure/
│       ├── Data/            # DbContext
│       ├── Repositories/    # Data access
│       └── Migrations/      # EF migrations
```

### Frontend (React Router v8)

```
frontend/
├── app/
│   ├── components/          # Reusable components
│   │   ├── Toast.tsx
│   │   └── Loading.tsx
│   │
│   ├── routes/             # Pages
│   │   ├── public/         # Public pages
│   │   ├── auth/           # Auth pages
│   │   ├── admin/          # Admin pages
│   │   ├── candidate/      # Candidate pages
│   │   └── hr/             # HR pages
│   │
│   ├── stores/             # Zustand stores
│   │   ├── useAuthStore.ts
│   │   └── useUIStore.ts
│   │
│   ├── lib/                # Utilities
│   │   ├── apiClient.ts
│   │   └── queryClient.ts
│   │
│   └── types/              # TypeScript types
```

---

## 🔐 Authentication & Authorization

### JWT Flow

1. User login với email/password
2. Backend validate và generate JWT token
3. Frontend lưu token vào localStorage
4. Mọi API request đều attach token vào header
5. Backend verify token và check permissions
6. Return data hoặc 401/403 error

### Roles

- **Admin**: Full access to system
- **HR**: Manage jobs & applications
- **Candidate**: Apply jobs & manage profile

### Protected Routes

```typescript
// Routes tự động redirect nếu unauthorized
/admin/*      -> Chỉ admin
/hr/*         -> Chỉ HR
/candidate/*  -> Chỉ candidate
```

---

## 🗄️ Database

### PostgreSQL Setup

```sql
-- Database đã được tạo
Database: futurecv_db
Username: postgres
Password: 36882044
Port: 5432
```

### Entities

- User
- Job
- Application
- Interview
- Company
- Skill
- Experience
- Education

### Migrations

```powershell
# Tạo migration mới
cd backend/src/FutureCV.Api
dotnet ef migrations add MigrationName

# Apply migrations
dotnet ef database update
```

---

## 📝 API Documentation

### Swagger UI

Truy cập: http://localhost:5000/swagger

### Main Endpoints

#### Authentication
```
POST /api/Auth/login       # Login
POST /api/Auth/register    # Register
POST /api/Auth/logout      # Logout
```

#### Jobs
```
GET    /api/Jobs           # Get all jobs
GET    /api/Jobs/{id}      # Get job by id
POST   /api/Jobs           # Create job (HR only)
PUT    /api/Jobs/{id}      # Update job (HR only)
DELETE /api/Jobs/{id}      # Delete job (HR/Admin)
```

#### Applications
```
GET    /api/Applications              # Get applications
POST   /api/Applications              # Submit application
PUT    /api/Applications/{id}/status  # Update status (HR)
```

---

## 🎨 UI/UX Design

### Color Palette

```css
/* Base colors */
--slate-900: #0F172A;     /* Background */
--slate-800: #1E293B;     /* Cards */
--slate-700: #334155;     /* Borders */

/* Primary */
--cyan-400: #22D3EE;      /* Primary accent */
--cyan-500: #06B6D4;      /* Primary hover */

/* Secondary */
--blue-500: #3B82F6;      /* Secondary accent */
--orange-500: #F97316;    /* Warning/Hot */

/* Text */
--slate-50: #F8FAFC;      /* Primary text */
--slate-400: #94A3B8;     /* Secondary text */
```

### Components

- Modern dark theme
- Gradient backgrounds
- Glassmorphism effects
- Smooth animations
- Responsive grid layouts
- Toast notifications
- Loading spinners

---

## 📚 Documentation

### Hướng dẫn chi tiết

- `/RUNNING_FCV82.md` - Backend setup guide
- `/frontend/SETUP_FRONTEND.md` - Frontend setup guide
- `/frontend/FRONTEND_COMPLETE.md` - Frontend completion summary

### Code Comments

- Tất cả các function quan trọng đều có comments
- TypeScript types cho type safety
- JSDoc comments cho functions phức tạp

---

## 🧪 Testing

### Backend

```powershell
cd backend
dotnet test
```

### Frontend

```powershell
cd frontend
npm run test        # Unit tests
npm run test:e2e    # E2E tests (if configured)
```

---

## 🚢 Deployment

### Backend (Azure/AWS)

```powershell
# Build production
dotnet publish -c Release

# Deploy to Azure
az webapp deploy --resource-group <group> --name <app-name>
```

### Frontend (Vercel/Netlify)

```powershell
# Build production
npm run build

# Deploy to Vercel
vercel deploy --prod
```

### Environment Variables

#### Backend (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
JWT_ISSUER=FutureCV
JWT_AUDIENCE=FutureCV-Users
```

#### Frontend (.env)
```
VITE_API_URL=https://api.futurecv.com
VITE_APP_NAME=FutureCV
```

---

## 🐛 Troubleshooting

### Backend không start

```powershell
# Check PostgreSQL service
Get-Service postgresql*

# Restart service
Restart-Service postgresql-x64-15
```

### Frontend không kết nối API

1. Check backend đang chạy: http://localhost:5000/swagger
2. Check CORS settings trong backend
3. Check VITE_API_URL trong `.env`
4. Check browser console

### Database connection error

1. Verify PostgreSQL đang chạy
2. Check connection string trong `appsettings.json`
3. Verify database `futurecv_db` exists
4. Run migrations: `dotnet ef database update`

---

## 📈 Roadmap

### Phase 1 (Đã hoàn thành) ✅
- [x] Backend API setup
- [x] Database setup
- [x] Authentication system
- [x] Frontend setup
- [x] Basic dashboards
- [x] UI components

### Phase 2 (Tiếp theo)
- [ ] Job search & filtering
- [ ] Application submission
- [ ] CV upload & parsing
- [ ] Interview scheduling
- [ ] Email notifications
- [ ] Real-time updates

### Phase 3 (Tương lai)
- [ ] Advanced analytics
- [ ] Chat system
- [ ] Video interview
- [ ] AI-powered matching
- [ ] Mobile app
- [ ] Multi-language support

---

## 👥 Team

**Development Team**
- Backend: ASP.NET Core + PostgreSQL
- Frontend: React + TypeScript
- UI/UX: Modern dark theme design

---

## 📄 License

Dự án này được phát triển cho mục đích học tập và nghiên cứu.

---

## 🙏 Acknowledgments

- React Router team
- TailwindCSS team
- ASP.NET Core team
- PostgreSQL community

---

## 📞 Support

### Documentation
- Backend: `/RUNNING_FCV82.md`
- Frontend: `/frontend/SETUP_FRONTEND.md`
- Complete: `/frontend/FRONTEND_COMPLETE.md`

### Issues
Nếu gặp vấn đề, hãy kiểm tra:
1. Cả backend và frontend đều đang chạy
2. PostgreSQL service đang hoạt động
3. Environment variables được cấu hình đúng
4. Dependencies đã được install đầy đủ

---

## ✨ Quick Commands

```powershell
# Start everything
.\start-futurecv.ps1

# Backend only
cd backend/src/FutureCV.Api && dotnet run

# Frontend only
cd frontend && npm run dev

# View logs
# Backend: Check terminal window
# Frontend: Check browser console
```

---

**Happy Coding! 🚀**

**Version**: 1.0.0  
**Last Updated**: Sep 6, 2026
