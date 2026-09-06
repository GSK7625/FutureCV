# FCV-82: Quick Start Guide 🚀

## ⚡ Chạy ngay trong 3 bước

### Bước 1: Start Backend
```powershell
cd C:\Users\nglic\Downloads\Documents\cdth\FutureCV\backend\src\FutureCV.Api
dotnet run
```
✅ Backend running at: **http://localhost:5000**

### Bước 2: Start Frontend
```powershell
cd C:\Users\nglic\Downloads\Documents\cdth\FutureCV\frontend
npm run dev
```
✅ Frontend running at: **http://localhost:5173** (or another port shown in terminal)

### Bước 3: Test Feature
1. Open browser: **http://localhost:5173/auth/login**
2. Login với HR/Employer account
3. Navigate to: **http://localhost:5173/hr/jobs**
4. Test các features:
   - ✅ Xem danh sách jobs
   - ✅ Tìm kiếm jobs
   - ✅ Filter theo status/active
   - ✅ Tạo job mới (click "+ Đăng tin mới")
   - ✅ Sửa job (click "Sửa")
   - ✅ Đóng/Mở job (click "Đóng tin"/"Mở tin")
   - ✅ Xóa job (click "Xóa")

---

## 🎯 Test Scenarios

### Test 1: Create Job ⭐
1. Click **"+ Đăng tin mới"**
2. Fill form:
   ```
   Title:          Senior React Developer
   Description:    Build amazing web apps
   Requirements:   3+ years React experience
   Benefits:       Remote work, great salary
   Salary Min:     2000
   Salary Max:     3000
   Currency:       USD
   Location:       Ho Chi Minh
   Level:          Senior
   Type:           Full-time
   Deadline:       2026-10-01
   ```
3. Click **"Đăng tin"**
4. ✅ Job appears in list

### Test 2: Search ⭐
1. Type in search box: **"React"**
2. ✅ Results filtered in real-time

### Test 3: Filter ⭐
1. Select status: **"Đã duyệt"**
2. ✅ Only approved jobs shown

### Test 4: Edit Job ⭐
1. Click **"Sửa"** on any job
2. Change title to: **"Super Senior React Developer"**
3. Click **"Cập nhật"**
4. ✅ Job updated in list

### Test 5: Toggle Status ⭐
1. Click **"Đóng tin"** on active job
2. ✅ Badge changes to "Đã đóng"
3. Click **"Mở tin"**
4. ✅ Badge changes to "Đang mở"

### Test 6: Delete Job ⭐
1. Click **"Xóa"**
2. Confirm dialog
3. ✅ Job removed from list

---

## 🐛 Common Issues & Fixes

### Issue 1: Cannot login
**Fix:** Check backend is running on port 5000
```powershell
# Test backend
curl http://localhost:5000/swagger
```

### Issue 2: 401 Unauthorized
**Fix:** Login again, token expired

### Issue 3: Empty job list
**Fix:** Create some jobs via backend or API

### Issue 4: 500 Server Error
**Fix:** Check backend logs and database connection

---

## 📝 Validation Rules

### Create/Edit Job Form:
- ✅ Title: Required, not empty
- ✅ Description: Required, not empty
- ✅ Requirements: Required, not empty
- ✅ Salary Min: Required, > 0
- ✅ Salary Max: Required, > 0, >= Salary Min
- ⚠️ Other fields: Optional

---

## 🎨 UI Features

### Job Card shows:
- 📋 Title
- 🏢 Company name
- 📍 Location
- 💼 Experience level
- ⏰ Employment type
- 💰 Salary range
- 📝 Description preview
- 🏷️ Status badges (Pending/Approved/Rejected)
- ✅ Active/Inactive badge
- ⏱️ Expired badge (if past deadline)
- 👁️ View count
- 📦 Positions count
- 📅 Deadline
- 📅 Created date
- 🔘 Action buttons: Sửa, Đóng/Mở tin, Xóa

### Filters:
- 🔍 Search by title (real-time, debounced)
- 📊 Status: All / Pending / Approved / Rejected
- ⚡ Active: All / Active / Inactive

### Pagination:
- ⬅️ Previous button
- ➡️ Next button
- 📄 Current page / Total pages

---

## ✅ Checklist hoàn thành

- [x] HRJobManagementPage component
- [x] CreateJobModal component
- [x] EditJobModal component
- [x] jobService with all APIs
- [x] useJobs hooks
- [x] Job types & interfaces
- [x] Route configuration
- [x] Search functionality
- [x] Filter by status
- [x] Filter by active
- [x] Pagination
- [x] Create job
- [x] Edit job
- [x] Delete job
- [x] Toggle job status
- [x] Form validation
- [x] Error handling
- [x] Loading states
- [x] Empty states
- [x] TypeScript types
- [x] Responsive design
- [x] Dark theme UI

---

## 🎯 API Endpoints Used

```
GET    /api/employer/jobs          → Lấy danh sách jobs
POST   /api/employer/jobs          → Tạo job mới
PUT    /api/employer/jobs/{id}     → Cập nhật job
DELETE /api/employer/jobs/{id}     → Xóa job
PATCH  /api/employer/jobs/{id}/status → Toggle active status
```

---

## 📱 Screenshots

### Desktop View
```
┌─────────────────────────────────────────────────────────┐
│ Header: "Quản lý tin tuyển dụng" [+ Đăng tin mới]      │
├─────────────────────────────────────────────────────────┤
│ [Search...] [Status ▾] [Active ▾]                      │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐   │
│ │ Senior React Developer        [Pending] [Mở]    │   │
│ │ 🏢 ABC Corp · 📍 HCM · 💼 Senior               │   │
│ │ 💰 2000-3000 USD                                │   │
│ │ Description...                                   │   │
│ │ 👁️ 100 · 📦 3 · ⏰ 31/10/2026    [Actions...]   │   │
│ └─────────────────────────────────────────────────┘   │
│ ...more cards...                                        │
├─────────────────────────────────────────────────────────┤
│          [← Trước] Page 1/5 [Sau →]                    │
└─────────────────────────────────────────────────────────┘
```

### Modal View
```
┌─────────────────────────────────────────────────────────┐
│ Đăng tin tuyển dụng mới                            [X]  │
├─────────────────────────────────────────────────────────┤
│ Tiêu đề công việc *                                     │
│ [_____________________________________]                 │
│                                                         │
│ Mô tả công việc *                                       │
│ [_____________________________________]                 │
│ [_____________________________________]                 │
│                                                         │
│ ...more fields...                                       │
│                                                         │
│ Lương *                                                 │
│ [Min: ___] [Max: ___] [USD ▾]                          │
│                                                         │
│                            [Hủy] [Đăng tin]            │
└─────────────────────────────────────────────────────────┘
```

---

**Status:** ✅ HOÀN THÀNH  
**Ready to test:** YES  
**All files created:** YES  
**TypeScript errors:** NONE
