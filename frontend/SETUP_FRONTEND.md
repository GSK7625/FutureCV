# Hướng dẫn Setup Frontend FutureCV

## 📋 Yêu cầu hệ thống

- **Node.js**: v18 trở lên (hiện tại đang dùng v24)
- **npm**: v9 trở lên (hiện tại đang dùng v11)
- **Backend**: Phải chạy trước trên http://localhost:5000

---

## 🚀 Cài đặt và chạy

### 1. Cài đặt dependencies

```powershell
cd C:\Users\nglic\Downloads\Documents\cdth\FutureCV\frontend
npm install
```

### 2. Cấu hình môi trường

File `.env` đã được tạo tự động với cấu hình:

```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=FutureCV
VITE_APP_VERSION=1.0.0
```

Nếu backend chạy ở port khác, hãy chỉnh sửa `VITE_API_URL` trong file `.env`.

### 3. Chạy development server

```powershell
npm run dev
```

Frontend sẽ chạy tại: **http://localhost:5173**

---

## 📱 Các trang đã tạo

### Public Pages
- **Trang chủ**: http://localhost:5173/
- **Giới thiệu**: http://localhost:5173/public/about

### Authentication
- **Đăng nhập**: http://localhost:5173/auth/login
- **Đăng ký**: http://localhost:5173/auth/register

### Admin Dashboard
- **Dashboard**: http://localhost:5173/admin/dashboard (Yêu cầu đăng nhập với role admin)

---

## 🔑 Tài khoản demo

### Admin
- **Email**: admin@futurecv.vn
- **Password**: Admin@123456

---

## 🛠️ Công nghệ sử dụng

- **Framework**: React 19 + React Router v8
- **Build Tool**: Vite 6
- **Styling**: TailwindCSS 4
- **State Management**: Zustand
- **API Client**: Axios
- **Data Fetching**: TanStack Query (React Query)
- **Type Safety**: TypeScript

---

## 📂 Cấu trúc thư mục

```
frontend/
├── app/
│   ├── routes/               # Route components
│   │   ├── public/          # Public pages (home, about)
│   │   ├── auth/            # Authentication pages (login, register)
│   │   └── admin/           # Admin pages (dashboard)
│   ├── stores/              # Zustand stores
│   │   ├── useAuthStore.ts  # Authentication state
│   │   └── useUIStore.ts    # UI state (loading, toasts)
│   ├── lib/                 # Utilities
│   │   ├── apiClient.ts     # Axios instance
│   │   └── queryClient.ts   # React Query client
│   ├── types/               # TypeScript types
│   ├── root.tsx             # Root layout
│   ├── routes.ts            # Route configuration
│   └── app.css              # Global styles
├── public/                   # Static assets
├── .env                      # Environment variables
├── package.json
├── vite.config.ts
└── tailwind.config.ts
```

---

## 🎨 Design System

Frontend sử dụng design system hiện đại với:

- **Base colors**: Deep slate (#0F172A, #1E293B)
- **Primary accent**: Cyan (#22D3EE, #38BDF8)
- **Secondary accent**: Orange (#F97316)
- **Typography**: Inter font family
- **Border radius**: 8-16px cho components
- **Spacing**: Tailwind default scale

---

## 🔄 API Integration

### API Client Configuration

File `app/lib/apiClient.ts` đã được cấu hình với:
- Base URL từ environment variable
- Auto attach JWT token từ localStorage
- Request/Response interceptors
- Error handling

### Authentication Flow

1. User login → Call `/api/Auth/login`
2. Receive JWT token + user info
3. Store in Zustand + localStorage
4. Auto attach token to all subsequent requests
5. Redirect to appropriate dashboard based on role

---

## 🧪 Development Commands

```powershell
# Chạy development server
npm run dev

# Build production
npm run build

# Preview production build
npm run preview

# Type check
npm run typecheck

# Lint (nếu có ESLint configured)
npm run lint
```

---

## 🔐 Protected Routes

Các route yêu cầu authentication:
- `/admin/*` - Chỉ admin
- `/hr/*` - Chỉ HR (chưa implement)
- `/candidate/*` - Chỉ candidate (chưa implement)

Route guards được implement trong component bằng:
```tsx
useEffect(() => {
  if (!isAuthenticated || user?.role !== "admin") {
    navigate("/auth/login");
  }
}, [isAuthenticated, user, navigate]);
```

---

## 📝 Các tính năng đã implement

### ✅ Authentication System
- [x] Login page với JWT authentication
- [x] Register page với role selection (candidate/hr)
- [x] Auth store với Zustand + localStorage persistence
- [x] Auto token attachment to API requests
- [x] Logout functionality

### ✅ UI Components
- [x] Toast notification system
- [x] Loading states
- [x] Responsive navigation
- [x] Modern dark theme design

### ✅ Pages
- [x] Landing page với hero section và features
- [x] About page
- [x] Login page
- [x] Register page
- [x] Admin dashboard với stats và activities

---

## 🚧 Cần phát triển thêm

### HR Dashboard
- [ ] HR dashboard page
- [ ] Job posting management
- [ ] Application review
- [ ] Interview scheduling

### Candidate Dashboard
- [ ] Candidate dashboard
- [ ] Job search and filtering
- [ ] Application submission
- [ ] Application tracking

### Common Features
- [ ] User profile management
- [ ] File upload (CV, avatar)
- [ ] Notifications
- [ ] Real-time updates
- [ ] Advanced search filters

---

## ❓ Troubleshooting

### Port đã được sử dụng
```powershell
# Kill process trên port 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Không kết nối được API
1. Kiểm tra backend đang chạy: http://localhost:5000/swagger
2. Kiểm tra CORS settings trong backend
3. Kiểm tra `VITE_API_URL` trong `.env`

### Module not found
```powershell
# Xóa node_modules và cài lại
rm -r node_modules
rm package-lock.json
npm install
```

---

## 📞 Support

Nếu gặp vấn đề, hãy kiểm tra:
1. Backend đang chạy và accessible
2. `.env` file được cấu hình đúng
3. Dependencies đã được install đầy đủ
4. Browser console để xem error messages

---

**Tạo bởi**: FutureCV Development Team
**Cập nhật**: Sep 6, 2026
