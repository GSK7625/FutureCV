# FCV-82: Giao diện quản lý Job cho Recruiter

## ✅ Đã hoàn thành

### 1. Components đã tạo

#### HRJobManagementPage.tsx
- Trang chính hiển thị danh sách Job của Recruiter
- **Tính năng:**
  - ✅ Tìm kiếm theo tiêu đề công việc
  - ✅ Lọc theo trạng thái duyệt (Pending/Approved/Rejected)
  - ✅ Lọc theo trạng thái active (Đang mở/Đã đóng)
  - ✅ Phân trang (pagination)
  - ✅ Hiển thị thống kê: lượt xem, số vị trí, deadline
  - ✅ Actions: Sửa, Đóng/Mở tin, Xóa

#### CreateJobModal.tsx
- Modal để tạo tin tuyển dụng mới
- **Form fields:**
  - ✅ Tiêu đề công việc (*)
  - ✅ Mô tả công việc (*)
  - ✅ Yêu cầu công việc (*)
  - ✅ Quyền lợi
  - ✅ Lương Min/Max/Currency (*)
  - ✅ Địa điểm
  - ✅ Cấp độ kinh nghiệm (Intern/Fresher/Junior/Middle/Senior/Lead)
  - ✅ Loại hình công việc (Full-time/Part-time/Contract/Freelance)
  - ✅ Ngày hết hạn
- ✅ Validation form đầy đủ
- ✅ Error handling

#### EditJobModal.tsx
- Modal để chỉnh sửa tin tuyển dụng
- ✅ Pre-fill data từ job hiện tại
- ✅ Các field giống CreateJobModal
- ✅ Validation và error handling

### 2. Services & Hooks

#### jobService.ts (app/services/)
```typescript
- getMyJobs(filters): JobsResponse // Lấy danh sách jobs với pagination
- createJob(data): Job              // Tạo job mới
- updateJob(id, data): Job          // Cập nhật job
- deleteJob(id): void               // Xóa job
- toggleJobStatus(id): Job          // Bật/tắt active status
```

#### useJobs.ts (app/hooks/)
```typescript
- useJobs(filters)        // Query jobs với filters
- useCreateJob()          // Mutation tạo job
- useUpdateJob()          // Mutation update job
- useDeleteJob()          // Mutation xóa job
- useToggleJobStatus()    // Mutation toggle status
```

### 3. Types

#### job.ts (app/types/)
```typescript
- Job                // Interface đầy đủ cho Job entity
- JobFilters         // Filters: page, pageSize, search, status, isActive
- JobsResponse       // Response với pagination metadata
- CreateJobRequest   // DTO tạo job mới
- UpdateJobRequest   // DTO cập nhật job
```

### 4. Routes

```typescript
// app/routes.ts
route("hr/jobs", "routes/hr/job-management.tsx")
```

**URL:** `/hr/jobs`

### 5. UI/UX Design

#### Design System
- ✅ Background: Deep slate (`bg-slate-950`, `bg-slate-900`)
- ✅ Accent: Cyan (`bg-cyan-500`, `text-cyan-400`)
- ✅ Cards: Slate with borders (`bg-slate-900/50 border-slate-800`)
- ✅ Radius: 8-12px rounded corners
- ✅ Typography: Clean, modern sans-serif
- ✅ Status badges: Color-coded (Yellow/Green/Red/Orange)

#### Components
- Search bar với real-time filtering
- Dropdown filters (Status & Active)
- Job cards với hover effects
- Loading states với spinner
- Error states với retry button
- Empty states với CTA
- Modals với backdrop blur
- Form validation với error messages

---

## 🚀 Cách chạy và test

### Bước 1: Chạy Backend
```powershell
cd C:\Users\nglic\Downloads\Documents\cdth\FutureCV\backend\src\FutureCV.Api
dotnet run
```
- Backend sẽ chạy tại: `http://localhost:5000`
- Swagger UI: `http://localhost:5000/swagger`

### Bước 2: Chạy Frontend
```powershell
cd C:\Users\nglic\Downloads\Documents\cdth\FutureCV\frontend
npm run dev
```
- Frontend sẽ chạy tại: `http://localhost:5173` (hoặc port khác)

### Bước 3: Đăng nhập
1. Mở browser: `http://localhost:5173/auth/login`
2. Đăng nhập với tài khoản HR/Employer
3. Sau khi đăng nhập thành công, navigate đến: `/hr/jobs`

### Bước 4: Test các tính năng

#### Test 1: Xem danh sách jobs
- ✅ Kiểm tra hiển thị danh sách jobs
- ✅ Kiểm tra pagination hoạt động
- ✅ Kiểm tra hiển thị đúng thông tin: title, company, salary, status, etc.

#### Test 2: Search và Filter
```
1. Nhập từ khóa vào ô "Tìm kiếm theo tiêu đề"
   - Kiểm tra debounce (wait 500ms trước khi search)
   - Kiểm tra kết quả tìm kiếm đúng

2. Chọn filter "Trạng thái"
   - Pending: Hiển thị jobs chờ duyệt
   - Approved: Hiển thị jobs đã duyệt
   - Rejected: Hiển thị jobs bị từ chối

3. Chọn filter "Đang hoạt động/Đã đóng"
   - Kiểm tra lọc theo isActive
```

#### Test 3: Tạo job mới
```
1. Click button "+ Đăng tin mới"
2. Modal CreateJobModal hiện ra
3. Điền form:
   - Title: "Senior React Developer" (*)
   - Description: "We are looking for..." (*)
   - Requirements: "3+ years React..." (*)
   - Benefits: "Competitive salary, remote work"
   - Salary Min: 2000 (*)
   - Salary Max: 3000 (*)
   - Currency: USD
   - Location: "Ho Chi Minh"
   - Experience Level: "Senior"
   - Employment Type: "Full-time"
   - Closing Date: 2026-10-01

4. Click "Đăng tin"
5. Kiểm tra:
   - Loading state hiển thị
   - Modal đóng sau khi thành công
   - Job mới xuất hiện trong danh sách
   - Toast/notification thành công (nếu có)
```

#### Test 4: Validation
```
1. Click "+ Đăng tin mới"
2. Bỏ trống các field bắt buộc
3. Click "Đăng tin"
4. Kiểm tra error messages hiển thị:
   - "Tiêu đề không được để trống"
   - "Mô tả không được để trống"
   - "Yêu cầu không được để trống"
   - "Lương tối thiểu phải lớn hơn 0"
   - etc.

5. Nhập Salary Max < Salary Min
6. Kiểm tra error: "Lương tối đa phải lớn hơn lương tối thiểu"
```

#### Test 5: Sửa job
```
1. Click button "Sửa" trên một job card
2. Modal EditJobModal hiện ra với data pre-filled
3. Sửa một số thông tin (vd: title, salary)
4. Click "Cập nhật"
5. Kiểm tra:
   - Job được cập nhật trong danh sách
   - Thông tin mới hiển thị đúng
```

#### Test 6: Toggle status (Đóng/Mở tin)
```
1. Click button "Đóng tin" trên một job đang active
2. Kiểm tra:
   - Job status chuyển sang inactive
   - Badge "Đã đóng" hiển thị
   - Button chuyển thành "Mở tin"

3. Click "Mở tin" trở lại
4. Kiểm tra job active lại
```

#### Test 7: Xóa job
```
1. Click button "Xóa" trên một job
2. Confirm dialog hiển thị: "Bạn có chắc muốn xóa tin tuyển dụng này?"
3. Click OK
4. Kiểm tra:
   - Job biến mất khỏi danh sách
   - Pagination update nếu cần
```

#### Test 8: Empty state
```
1. Xóa hết jobs hoặc filter không có kết quả
2. Kiểm tra empty state hiển thị:
   - Message: "Chưa có tin tuyển dụng nào"
   - Button "Đăng tin đầu tiên"
```

#### Test 9: Loading state
```
1. Reload trang
2. Kiểm tra loading spinner hiển thị
3. Message: "Đang tải danh sách công việc..."
```

#### Test 10: Error state
```
1. Tắt backend API
2. Reload trang
3. Kiểm tra error state hiển thị:
   - Message: "Có lỗi xảy ra khi tải danh sách"
   - Button "Thử lại"
```

---

## 📋 API Endpoints cần có ở Backend

### GET /api/employer/jobs
**Query params:**
- `pageIndex`: number (default: 1)
- `pageSize`: number (default: 10)
- `search`: string (optional)
- `status`: "Pending" | "Approved" | "Rejected" (optional)
- `isActive`: boolean (optional)

**Response:**
```json
{
  "items": [Job[]],
  "totalCount": number,
  "pageIndex": number,
  "pageSize": number,
  "totalPages": number,
  "hasPreviousPage": boolean,
  "hasNextPage": boolean
}
```

### POST /api/employer/jobs
**Body:**
```json
{
  "title": string,
  "description": string,
  "requirements": string,
  "benefits": string,
  "salaryMin": number,
  "salaryMax": number,
  "salaryCurrency": string,
  "location": string (optional),
  "experienceLevel": string (optional),
  "employmentType": string (optional),
  "closingDate": string (optional)
}
```

**Response:** Job

### PUT /api/employer/jobs/{id}
**Body:** Same as POST

**Response:** Job

### DELETE /api/employer/jobs/{id}
**Response:** 204 No Content

### PATCH /api/employer/jobs/{id}/status
**Response:** Job (với isActive toggled)

---

## 🔧 Troubleshooting

### Lỗi: "axios" not found
```powershell
cd C:\Users\nglic\Downloads\Documents\cdth\FutureCV\frontend
npm install axios
```

### Lỗi: Login not a function
- Kiểm tra `useAuthStore` đã export đúng
- Kiểm tra `apiClient` đã import đúng
- Kiểm tra backend API `/api/auth/login` đang chạy

### Lỗi: 500 Internal Server Error
- Check backend logs
- Kiểm tra database connection
- Kiểm tra authorization token
- Kiểm tra user role có phải "hr" hoặc "employer"

### Lỗi: Cannot access /hr/jobs
- Kiểm tra đã đăng nhập với role HR/Employer
- Kiểm tra `requireRole` guard hoạt động
- Kiểm tra route đã được define trong `routes.ts`

---

## 📁 File Structure

```
frontend/
├── app/
│   ├── features/
│   │   └── hr/
│   │       └── components/
│   │           ├── HRJobManagementPage.tsx  ✅
│   │           ├── CreateJobModal.tsx       ✅
│   │           └── EditJobModal.tsx         ✅
│   ├── services/
│   │   └── jobService.ts                    ✅
│   ├── hooks/
│   │   └── useJobs.ts                       ✅
│   ├── types/
│   │   └── job.ts                           ✅
│   ├── routes/
│   │   └── hr/
│   │       └── job-management.tsx           ✅
│   └── routes.ts                            ✅ (updated)
```

---

## ✨ Next Steps (Tùy chọn)

1. **Add toast notifications** cho các actions (create/update/delete)
2. **Add job detail modal** để xem chi tiết job
3. **Add bulk actions** (xóa nhiều jobs cùng lúc)
4. **Add export to Excel/PDF**
5. **Add analytics dashboard** (views over time, etc.)
6. **Add job duplication** (clone job)
7. **Add draft mode** (lưu nháp trước khi publish)
8. **Add rich text editor** cho description/requirements/benefits

---

## 🎨 Screenshots

### Main Page
- Header với title "Quản lý tin tuyển dụng"
- Button "+ Đăng tin mới"
- Search bar + 2 filter dropdowns
- Job cards grid với pagination

### Create Modal
- Large modal với form fields
- Clean layout, 2 columns cho salary
- Validation messages in red
- Primary button "Đăng tin"

### Edit Modal
- Similar to Create
- Pre-filled data
- Primary button "Cập nhật"

### Job Card
- Title + badges (status, active/inactive, expired)
- Company, location, level, employment type
- Salary range in cyan
- Description preview (2 lines max)
- 3 action buttons: Sửa, Đóng/Mở tin, Xóa
- Footer: views, positions, deadline, created date

---

**Tác giả:** AI Assistant  
**Ngày:** 2026-09-06  
**Version:** 1.0.0
