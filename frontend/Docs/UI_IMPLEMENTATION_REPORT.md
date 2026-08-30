# Báo cáo triển khai: Frontend UI Design System FutureCV

> Triển khai theo plan `.kilo/plans/1788077010116-frontend-ui-design-system-plan.md`
> Ngày hoàn thành: 30/08/2026
> Phạm vi: Design system "Midnight & Gold Professional" + 4 màn Stitch (Trang chủ, Đăng nhập, Đăng ký, Tìm kiếm việc làm) + các trang Candidate còn lại.

---

## 1. Kết quả xác thực

| Hạng mục | Trạng thái |
|---|---|
| `npm run typecheck` (react-router typegen + tsc) | PASS |
| `npm run build` (SPA Mode, Vite 8) | PASS |
| Dev server `npm run dev` (localhost:5173) | PASS, `/`, `/login`, `/register`, `/candidate`, `/about`, `/contact` trả 200 |
| Dependencies đã cài | `class-variance-authority`, `clsx`, `tailwind-merge`, `@tabler/icons-react`, `motion`, `@fontsource-variable/hanken-grotesk` |

---

## 2. Design system: Midnight & Gold Professional

Nguồn token: `frontend/Docs/stitch/.../midnight_gold_professional/DESIGN.md`, triển khai trong `frontend/app/app.css` bằng Tailwind v4 `@theme` (CSS variables, light mode mặc định, sẵn sàng cho dark mode sau này).

| Token | Giá trị | Sử dụng |
|---|---|---|
| `--color-navy` | `#0B132B` | header, primary button, text đậm, topbar |
| `--color-navy-secondary` | `#1C2541` | container phụ, badge navy tint |
| `--color-gold` | `#C8963E` | CTA highlight, badge HOT/Premium (dùng tiết chế) |
| `--color-background` | `#F8F9FA` | Level 0 |
| `--color-surface` | `#FFFFFF` + border `#E9ECEF` + shadow `0 4px 20px rgba(11,19,43,.04)` | Level 1 (card) |
| Shadow overlay | `0 12px 32px rgba(11,19,43,.12)` | Level 2 (modal, dropdown, search bar hero) |
| Text | `#191C1D` / `#45464D` / `#6C757D` | ink / ink-variant / ink-muted |
| Font | Hanken Grotesk Variable (tự host qua `@fontsource-variable`, bỏ Google Fonts link) | display 48/700, headline 32/600, body 16/400, label 14/500 |
| Radius | `tag` 4px, default 8px, `lg` 12px, `xl` 16px | một hệ thống duy nhất |
| Layout | container 1280px, gutter 24px, margin desktop 40px / mobile 16px | |
| Z-index scale | nav 50 → dropdown 100 → overlay 200 → modal 210 → toast 300 | được document trong app.css |
| Motion | `--ease-out-soft`, hỗ trợ `prefers-reduced-motion` | |

**Quyết định design đã giữ theo plan:**
- Bỏ design system Velocity Talent (xanh lá `#00B14F`) — auth thiết kế lại theo navy/gold.
- Icons: Material Symbols → `@tabler/icons-react` toàn bộ project.
- Copy tiếng Việt, zero em-dash.
- Gold `#C8963E` trên nền trắng chỉ dùng cho badge / large text; text gold cỡ nhỏ đã đổi sang navy hoặc đặt trên nền navy (kiểm tra contrast AA).

---

## 3. Phase 0 — Foundation (hoàn thành)

### 3.1. Router
- `app/routes.ts` viết lại hoàn chỉnh: 5 layout route (`PublicLayout`, `AuthLayout`, `CandidateLayout`, `HRLayout`, `AdminLayout`) + wildcard `*` → 404.
- Candidate **không có dashboard** (đã xóa `routes/candidate/dashboard.tsx`): `/candidate` = trang tìm kiếm việc làm (index → job-list).
- Route chi tiết:

```
/                                → home (PublicLayout)
/about, /contact                 → public pages
/login, /register, /forgot-password → auth pages (AuthLayout)
/candidate                       → job-list (CandidateLayout, guard candidate)
/candidate/jobs/:jobId           → job-detail
/candidate/jobs/:jobId/apply     → apply-form
/candidate/profile               → profile
/hr, /hr/*                       → placeholder (HRLayout)
/admin, /admin/*                 → placeholder (AdminLayout)
*                                → not-found
```

### 3.2. Core libs, stores, guards
- `app/lib/cn.ts` — `cn()` (clsx + tailwind-merge).
- `app/lib/fetcher.ts` — fetch wrapper: JSON, Bearer token từ store, `ApiError` parse message theo chuẩn backend .NET (`{ message }` / `{ errors }`), API base `http://localhost:5000` (VITE_API_URL).
- `app/lib/queryClient.ts`, `app/lib/queryKeys.ts` — TanStack Query client + key registry.
- `app/stores/useAuthStore.ts` — Zustand persist localStorage (`futurecv-auth`): user + accessToken + refreshToken, `setSession` / `updateTokens` / `logout`.
- `app/stores/useUIStore.ts` — toast queue (success/error/info, tự dismiss 5s).
- `app/guards/requireAuth.ts`, `requireRole.ts` — guard ngoài component dùng `useAuthStore.getState()` (không gọi hook), throw `redirect('/login?returnTo=...')` / `redirect('/')`.
- `app/hooks/useDebounce.ts`, `useWindowSize.ts`; `app/utils/index.ts` (`formatSalary`, `timeAgo`, `formatNumber`).
- `app/root.tsx` — lang `vi`, title "FutureCV - Việc làm & Tạo CV Online", font tự host, `QueryClientProvider`, `ToastViewport`, ErrorBoundary tiếng Việt.

### 3.3. UI kit tự viết (`app/components/ui/`, CVA + Tailwind tokens, không shadcn/Radix)
| Component | Đặc điểm chính |
|---|---|
| `Button` | variant primary/secondary/accent/ghost/danger; size sm/md/lg/icon; `:active scale-[0.98]` |
| `Input` + `Field` | label TRÊN, error DƯỚI; focus border navy + ring navy 20%; error trạng thái đỏ + `aria-invalid` |
| `Card`, `CardHeader/Content/Footer` | nền trắng, border `#E9ECEF`, shadow Level 1 |
| `Badge` | variant navy/gold/neutral/success/danger + solid; shape tag (4px)/pill |
| `Table` | header label-sm uppercase, row hover `#F1F3F5` theo DESIGN.md |
| `Modal` | shadow Level 2 + backdrop blur 12px, đóng bằng Esc/click ngoài, khóa scroll |
| `Avatar` | ảnh hoặc initials, 3 size |
| `Skeleton` | khối pulse thay spinner |
| `EmptyState` | icon + title + description + action |
| `Toast` (`ToastViewport`) | `aria-live`, 3 variant, gắn `useUIStore` |

### 3.4. Shared components (`app/components/shared/`)
- `QueryBoundary` — skeleton khớp layout khi loading (không spinner tròn), error state kèm nút "Thử lại" (tích hợp `useQueryErrorResetBoundary`), xử lý 401.
- `SkeletonCard` — helper ghép skeleton.
- `StatusBadge` — map tone → badge.
- `JobCard` — card việc dùng dùng chung cho home + job-detail (logo, title, company, chip lương/địa điểm/HOT, bookmark).

### 3.5. Feature layer
- **auth**: types khớp DTO backend C# (`AuthResponse`: accessToken/refreshToken/role); `authService` gọi đúng endpoint `POST /api/auth/login`, `/api/auth/register/candidate`, `/api/auth/forgot-password`, `/api/auth/logout`; `useLogin`, `useRegister` (mutation, set session, toast, navigate theo role + `returnTo`).
- **candidate**: types Job/JobFilters/JobListResult/ApplicationDto; `candidateQueryKeys`; `jobService` (list/detail/apply/similar — hiện **fallback dữ liệu demo** khi Jobs API chưa có ở backend, chỉ Auth API đã tồn tại); `useJobList` (placeholderData giữ nội dung khi refetch), `useApplyJob`; `useCandidateFilterStore` (keyword/category/location/jobType + clearAll).

---

## 4. Phase 1 — Public (hoàn thành)

- **`PublicLayout`**: navbar 1 line h-72px (≤72px theo plan), sticky, mobile hamburger; khối "Bạn là nhà tuyển dụng?"; hiển thị user + đăng xuất khi đã login; footer navy 4 cột (Thông tin / Pháp lý / Liên hệ hotline 1900 068 889). Đã bỏ floating action buttons thừa của Stitch.
- **`routes/public/home.tsx`** (từ Stitch base, nâng cấp theo skill):
  - Hero navy: headline 1 dòng "Tạo CV, Tìm việc làm, Tuyển dụng hiệu quả", subtitle ≤20 từ, search bar (keyword + địa điểm + CTA gold) giữ nguyên vì là chức năng job-board; brand đổi "TopCV" → "FutureCV".
  - Ngành nghề (glass card) + promo AI card → **asymmetric split** (1/3 + 2/3), ảnh dùng `picsum.photos/seed/` (fallback an toàn thay ảnh Stitch có thể hết hạn).
  - "Việc làm nổi bật": tabs (văn phòng/phổ thông) + location chips + grid 3-col JobCard, dữ liệu thật từ `useJobList` (demo data).
  - "Công ty nổi bật" 4-col cards và "Top ngành nghề" icon grid: **2 layout family khác nhau**, không lặp.
  - Hotline section gradient navy → slate + CTA "Tìm việc khó đã có FutureCV".
  - Motion: hero entry + `whileInView` stagger qua `motion/react`, tôn trọng `useReducedMotion`, chỉ transform/opacity.
- **`about.tsx`, `contact.tsx`, `not-found.tsx`**: cùng system, tối giản (form liên hệ có toast, 404 có số lớn + 2 CTA).

## 5. Phase 2 — Auth (hoàn thành, bỏ Velocity green)

- **`AuthLayout`**: split-screen — form trái nền light, panel phải navy (dot pattern gold + 3 highlight có icon, chỉ hiện ≥1024px); redirect về `/` nếu đã login.
- **`login.tsx`**: nối `useLogin` (hỗ trợ `?returnTo=`), validate inline đạt AA, show/hide mật khẩu, social login Google/Facebook (logo Tabler), divider, loading/disabled khi submit, toast error từ `ApiError`.
- **`register.tsx`**: validate email format, mật khẩu ≥8 ký tự, confirm khớp; nối `useRegister` → tự đăng nhập theo contract backend (register trả `AuthResponse`).
- **`forgot-password.tsx`**: gọi `POST /api/auth/forgot-password`, state thành công (email anti-enumeration, ghi chú token hiệu lực 15 phút).

## 6. Phase 3 — Candidate (trọng tâm, hoàn thành)

- **`CandidateLayout`**: app-shell topbar navy 72px, search bar trong topbar (ghi `?q=`), thông báo, user menu (hồ sơ / đăng xuất) đóng khi click ngoài; `clientLoader` → `requireRole(['candidate'])` — chưa login vào `/candidate` sẽ redirect `/login`.
- **`job-list.tsx`**: breadcrumb + header "Tuyển dụng n việc làm {từ khóa}" + search bar navy (style Stitch); sidebar filters sticky (danh mục nghề, địa điểm, hình thức làm việc, xóa lọc); danh sách **job rows** (layout family khác với card grid ở home): logo, title, salary badge gold, chips địa điểm/kinh nghiệm/HOT, time ago, heart; skeleton 3 khối khi loading, **EmptyState** khi 0 kết quả, nút "Xem thêm".
- **`job-detail.tsx`**: breadcrumb, header job (logo, salary, chips, thời gian đăng), CTA gold "Ứng tuyển ngay" + "Lưu việc làm", mô tả + yêu cầu + quyền lợi (list có icon), thẻ công ty, **Việc làm tương tự** 3 JobCard.
- **`apply-form.tsx`**: breadcrumb, form Field chuẩn (label trên/error dưới) họ tên/email/SĐT, upload CV (drag-style zone, validate file), thư giới thiệu, submit qua `useApplyJob`, **state thành công** riêng với 2 CTA.
- **`profile.tsx`**: completion progress (track navy 8px, **fill gold**, % + checklist), card thông tin cá nhân với **edit inline** (Chỉnh sửa/Lưu/Hủy), quản lý kỹ năng (thêm/xóa chip), quản lý CV.

## 7. Phase 4 — Dọn dẹp + tài liệu (hoàn thành)

- 8 route HR/Admin (`dashboard`, `job-management`, `candidate-pipeline`, `interview`, `user-management`, `role-permission`, `system-config`) → placeholder "Chức năng đang được phát triển" (`ComingSoon`) cùng system; 2 layout tối giản tương ứng.
- `frontend/Docs/ROUTER_AND_ZUSTAND.md` bổ sung **Route Tree đầy đủ + Bảng URL toàn dự án** (đã bỏ `candidate/dashboard` khỏi route tree, `/candidate` = job-list) + code mẫu Zustand persist + guards `.getState()` + lỗi thường gặp.
- Stitch export chuyển từ `frontend/stitch_topcv_recruitment_landing_page/` → `frontend/Docs/stitch/` để tham chiếu; **đã xóa** `frontend/stitch_topcv_recruitment_landing_page.zip`.

---

## 8. Pre-Flight Check (Section 14 của skill)

| Hạng mục | Kết quả |
|---|---|
| Zero em-dash trong copy tiếng Việt | PASS (grep toàn `app/`) |
| Hero fits viewport, headline ≤2 dòng | PASS |
| CTA không wrap (`whitespace-nowrap` trong Button) | PASS |
| Form contrast AA, error inline | PASS |
| Eyebrow count | Không lạm dụng eyebrow |
| Mobile collapse rõ ràng ở mọi section | PASS (grid 1-col, hamburger, split-screen collapse) |
| Reduced motion | PASS (`useReducedMotion` + media query CSS) |
| Icon library hợp lệ | PASS (100% `@tabler/icons-react`, không còn Material Symbols) |
| Gold trên trắng chỉ badge/large text | PASS (salary đã đổi sang Badge gold; link "Khám phá ngay" đổi navy) |
| Không route nằm ngoài layout | PASS |
| `ssr: false` giữ nguyên, guard dùng `.getState()` | PASS |

---

## 9. Còn lại / lưu ý cho người tiếp theo

1. **Jobs API chưa tồn tại ở backend** (hiện chỉ có AuthController). `jobService` tạm fallback dữ liệu demo khi fetch lỗi network — khi backend sẵn sàng, chỉ cần thêm endpoint `/api/jobs`, `/api/jobs/:id`, `/api/applications` là UI tự nối, không cần sửa component.
2. `useLogin`/`useRegister` đang set `user` thiếu `id/email/fullName` (backend `AuthResponse` chỉ trả role + token). Khi backend bổ sung endpoint `me`, cần map lại user trong store.
3. Refresh token rotation (`POST /api/auth/refresh`) chưa tự động gọi khi 401 — có thể thêm interceptor trong `fetcher.ts`.
4. Bookmark/heart trên job card mới là UI, chưa có store/API lưu trạng thái.
5. Dark mode: token CSS variables đã chuẩn bị, chưa làm toggle theme (theo plan, light là mặc định).
