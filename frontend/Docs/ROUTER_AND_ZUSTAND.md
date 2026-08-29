# React Router v8 & Zustand — Hướng dẫn cho Team

> Tài liệu này giải thích **tại sao** phải dùng `ssr: false` và **cách đúng** để làm việc với React Router v8 SPA Mode + Zustand trong dự án FutureCV.

---

## Mục lục

1. [Tại sao `ssr: false` là bắt buộc](#tại-sao-ssr-false-là-bắt-buộc)
2. [SSR vs SPA Mode — So sánh chi tiết](#ssr-vs-spa-mode--so-sánh-chi-tiết)
3. [Route Tree đầy đủ](#route-tree-đầy-đủ)
4. [Bảng URL toàn dự án](#bảng-url-toàn-dự-án)
5. [Zustand — Code mẫu](#zustand--code-mẫu)
6. [Guards — Bảo vệ route đúng cách](#guards--bảo-vệ-route-đúng-cách)
7. [Các lỗi thường gặp](#các-lỗi-thường-gặp)

---

## Tại sao `ssr: false` là bắt buộc

```ts
// react-router.config.ts
export default {
  // ⚠️ KHÔNG ĐƯỢC đổi thành true khi dùng Zustand
  ssr: false,
} satisfies Config;
```

### Vấn đề khi bật `ssr: true` với Zustand

React Router v8 với `ssr: true` sẽ render component **hai lần**:

```
Lần 1: Server Node.js render HTML
        │
        │  Zustand khởi tạo → store RỖNG
        │  vì Node.js không có window / localStorage
        │
        ▼
   Server gửi HTML về browser (store rỗng)

Lần 2: Browser nhận HTML, React "hydrate"
        │
        │  Zustand khởi tạo lại → đọc localStorage
        │  store có DATA (vd: user đã login)
        │
        ▼
   React thấy HTML server ≠ HTML client
        │
        ▼
   💥 HYDRATION MISMATCH / window is not defined
```

### Tại sao `ssr: false` giải quyết được

```
Browser Request
      │
      ▼
  Server chỉ trả về file HTML rỗng + JS bundle
      │
      ▼
  Browser chạy JS, React mount lần đầu tiên
      │
      ▼
  Zustand khởi tạo → đọc localStorage thành công
      │
      ▼
  ✅ Không có lần render nào trên server → không hydration mismatch
```

---

## SSR vs SPA Mode — So sánh chi tiết

| Tiêu chí | `ssr: true` | `ssr: false` ✅ |
|----------|-------------|----------------|
| Render | Server + Client | Client only |
| `loader` | Chạy trên Node.js server | ❌ Không dùng, thay bằng `clientLoader` |
| `action` | Chạy trên Node.js server | ❌ Không dùng, thay bằng `clientAction` |
| `clientLoader` | Chạy sau server loader | ✅ Dùng thay hoàn toàn cho `loader` |
| Zustand | ❌ Lỗi hydration | ✅ Hoạt động hoàn hảo |
| Auth guard | Server middleware | `clientLoader` → `useAuthStore.getState()` |
| SEO | HTML đầy đủ từ server | Cần config meta tĩnh |
| Build output | Server bundle + client | Client bundle only (static files) |
| Deploy | Cần Node.js server | Nginx / S3 / Netlify / Vercel static |

> **Kết luận:** Với dự án này dùng Zustand để quản lý auth, **SPA Mode là lựa chọn duy nhất phù hợp**.

---

## Route Tree đầy đủ

File: [`app/routes.ts`](./app/routes.ts)

```ts
import {
  type RouteConfig,
  index,
  layout,
  route,
  prefix,
} from "@react-router/dev/routes";

export default [

  // ─── PUBLIC ───────────────────────────────────────────────────────
  // Không cần đăng nhập, dùng PublicLayout (Navbar + Footer)
  layout("layouts/PublicLayout.tsx", [
    index("routes/public/home.tsx"),                       // /
    route("about",   "routes/public/about.tsx"),           // /about
    route("contact", "routes/public/contact.tsx"),         // /contact
  ]),

  // ─── AUTH ─────────────────────────────────────────────────────────
  // Chỉ vào được khi CHƯA đăng nhập (redirect nếu đã login)
  layout("layouts/AuthLayout.tsx", [
    route("login",           "routes/auth/login.tsx"),           // /login
    route("register",        "routes/auth/register.tsx"),        // /register
    route("forgot-password", "routes/auth/forgot-password.tsx"), // /forgot-password
  ]),

  // ─── CANDIDATE ────────────────────────────────────────────────────
  // Yêu cầu: đã login + role === 'candidate'
  layout("layouts/CandidateLayout.tsx", [
    ...prefix("candidate", [
      index("routes/candidate/dashboard.tsx"),                        // /candidate
      route("jobs",               "routes/candidate/job-list.tsx"),   // /candidate/jobs
      route("jobs/:jobId",        "routes/candidate/job-detail.tsx"), // /candidate/jobs/:jobId
      route("jobs/:jobId/apply",  "routes/candidate/apply-form.tsx"), // /candidate/jobs/:jobId/apply
      route("profile",            "routes/candidate/profile.tsx"),    // /candidate/profile
    ]),
  ]),

  // ─── HR ───────────────────────────────────────────────────────────
  // Yêu cầu: đã login + role === 'hr'
  layout("layouts/HRLayout.tsx", [
    ...prefix("hr", [
      index("routes/hr/dashboard.tsx"),                              // /hr
      route("jobs",      "routes/hr/job-management.tsx"),            // /hr/jobs
      route("pipeline",  "routes/hr/candidate-pipeline.tsx"),        // /hr/pipeline
      route("interview", "routes/hr/interview.tsx"),                 // /hr/interview
    ]),
  ]),

  // ─── ADMIN ────────────────────────────────────────────────────────
  // Yêu cầu: đã login + role === 'admin'
  layout("layouts/AdminLayout.tsx", [
    ...prefix("admin", [
      index("routes/admin/dashboard.tsx"),                           // /admin
      route("users",         "routes/admin/user-management.tsx"),    // /admin/users
      route("roles",         "routes/admin/role-permission.tsx"),    // /admin/roles
      route("system-config", "routes/admin/system-config.tsx"),      // /admin/system-config
    ]),
  ]),

  // ─── 404 ──────────────────────────────────────────────────────────
  route("*", "routes/public/not-found.tsx"),

] satisfies RouteConfig;
```

---

## Bảng URL toàn dự án

| URL | Route File | Layout | Guard |
|-----|-----------|--------|-------|
| `/` | `routes/public/home.tsx` | PublicLayout | — |
| `/about` | `routes/public/about.tsx` | PublicLayout | — |
| `/contact` | `routes/public/contact.tsx` | PublicLayout | — |
| `/login` | `routes/auth/login.tsx` | AuthLayout | redirect nếu đã login |
| `/register` | `routes/auth/register.tsx` | AuthLayout | redirect nếu đã login |
| `/forgot-password` | `routes/auth/forgot-password.tsx` | AuthLayout | — |
| `/candidate` | `routes/candidate/dashboard.tsx` | CandidateLayout | `requireRole('candidate')` |
| `/candidate/jobs` | `routes/candidate/job-list.tsx` | CandidateLayout | `requireRole('candidate')` |
| `/candidate/jobs/:jobId` | `routes/candidate/job-detail.tsx` | CandidateLayout | `requireAuth` |
| `/candidate/jobs/:jobId/apply` | `routes/candidate/apply-form.tsx` | CandidateLayout | `requireRole('candidate')` |
| `/candidate/profile` | `routes/candidate/profile.tsx` | CandidateLayout | `requireRole('candidate')` |
| `/hr` | `routes/hr/dashboard.tsx` | HRLayout | `requireRole('hr')` |
| `/hr/jobs` | `routes/hr/job-management.tsx` | HRLayout | `requireRole('hr')` |
| `/hr/pipeline` | `routes/hr/candidate-pipeline.tsx` | HRLayout | `requireRole('hr')` |
| `/hr/interview` | `routes/hr/interview.tsx` | HRLayout | `requireRole('hr')` |
| `/admin` | `routes/admin/dashboard.tsx` | AdminLayout | `requireRole('admin')` |
| `/admin/users` | `routes/admin/user-management.tsx` | AdminLayout | `requireRole('admin')` |
| `/admin/roles` | `routes/admin/role-permission.tsx` | AdminLayout | `requireRole('admin')` |
| `/admin/system-config` | `routes/admin/system-config.tsx` | AdminLayout | `requireRole('admin')` |
| `/*` | `routes/public/not-found.tsx` | — | — |

---

## Zustand — Code mẫu

### `useAuthStore.ts`

```ts
// app/stores/useAuthStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'candidate' | 'hr' | 'admin';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage', // key lưu trong localStorage
    }
  )
);
```

### `useUIStore.ts`

```ts
// app/stores/useUIStore.ts
import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UIState {
  isLoading: boolean;
  modalOpen: boolean;
  toastQueue: Toast[];

  setLoading: (v: boolean) => void;
  openModal: () => void;
  closeModal: () => void;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  isLoading: false,
  modalOpen: false,
  toastQueue: [],

  setLoading: (v) => set({ isLoading: v }),
  openModal: () => set({ modalOpen: true }),
  closeModal: () => set({ modalOpen: false }),

  pushToast: (toast) =>
    set((s) => ({
      toastQueue: [...s.toastQueue, { ...toast, id: crypto.randomUUID() }],
    })),

  removeToast: (id) =>
    set((s) => ({
      toastQueue: s.toastQueue.filter((t) => t.id !== id),
    })),
}));
```

### Cách dùng đúng trong Component

```tsx
// ✅ Trong React component — dùng hook bình thường
function Header() {
  const { user, logout } = useAuthStore();
  const { isLoading } = useUIStore();

  return (
    <header>
      <span>{user?.name}</span>
      <button onClick={logout}>Đăng xuất</button>
    </header>
  );
}
```

```ts
// ✅ Ngoài React component (guard, clientLoader) — dùng .getState()
function requireAuth() {
  const { isAuthenticated } = useAuthStore.getState(); // ← .getState()
  if (!isAuthenticated) throw redirect('/login');
}
```

### Quy tắc vàng về Zustand

| ✅ Làm | ❌ Không làm |
|--------|------------|
| `useAuthStore()` trong React component | `useAuthStore()` ngoài component |
| `useAuthStore.getState()` trong guard/loader | `useAuthStore()` trong guard/loader |
| `persist` middleware để lưu token | Tự set `localStorage` thủ công |
| Reset toàn bộ state khi `logout()` | Chỉ xóa 1 field khi logout |
| Chia nhỏ store theo domain | 1 store khổng lồ `useGlobalStore` |
| State cục bộ → `useState` trong component | Cho mọi state vào Zustand |

---

## Guards — Bảo vệ route đúng cách

### `requireAuth.ts`

```ts
// app/guards/requireAuth.ts
import { redirect } from 'react-router';
import { useAuthStore } from '~/stores/useAuthStore';

/**
 * Dùng trong clientLoader. Throw redirect nếu chưa đăng nhập.
 * ⚠️ Phải dùng .getState() vì đây KHÔNG phải React component.
 */
export function requireAuth() {
  const { isAuthenticated } = useAuthStore.getState();
  if (!isAuthenticated) throw redirect('/login');
}
```

### `requireRole.ts`

```ts
// app/guards/requireRole.ts
import { redirect } from 'react-router';
import { useAuthStore } from '~/stores/useAuthStore';

/**
 * Kiểm tra role. Throw redirect nếu không đủ quyền.
 * @param allowedRoles - Danh sách role được phép truy cập
 */
export function requireRole(allowedRoles: string[]) {
  const { role, isAuthenticated } = useAuthStore.getState();

  if (!isAuthenticated) throw redirect('/login');

  if (!role || !allowedRoles.includes(role)) {
    throw redirect('/'); // Về trang chủ nếu sai role
  }
}
```

### Cách dùng guard trong route

```tsx
// app/routes/candidate/dashboard.tsx

import { CandidateDashboardPage } from '~/features/candidate/components/CandidateDashboardPage';
import { requireRole } from '~/guards/requireRole';

// clientLoader chạy trên BROWSER (vì ssr: false)
// Không phải loader — loader chạy trên server
export async function clientLoader() {
  requireRole(['candidate']); // 🔐 Kiểm tra quyền trước
  // Có thể fetch thêm data ở đây nếu cần
}

export default function CandidateDashboardRoute() {
  return <CandidateDashboardPage />;
}
```

### Sơ đồ luồng guard

```
User truy cập /candidate/dashboard
      │
      ▼
clientLoader() chạy
      │
      ├── requireRole(['candidate'])
      │         │
      │         ├── isAuthenticated === false?
      │         │       └── throw redirect('/login') ──► /login
      │         │
      │         └── role !== 'candidate'?
      │                 └── throw redirect('/') ──────► /
      │
      ▼ (pass)
Component render
      │
      ▼
CandidateDashboardPage hiển thị
```

---

## Các lỗi thường gặp

### ❌ Lỗi 1: Dùng `loader` thay vì `clientLoader`

```ts
// ❌ SAI — loader chạy trên server, server không có Zustand state
export async function loader() {
  requireAuth(); // useAuthStore.getState() trả về null vì server
}

// ✅ ĐÚNG — clientLoader chạy trên browser
export async function clientLoader() {
  requireAuth();
}
```

---

### ❌ Lỗi 2: Dùng hook Zustand ngoài component

```ts
// ❌ SAI — hook chỉ dùng được trong React component
export function requireAuth() {
  const { isAuthenticated } = useAuthStore(); // 💥 Invalid hook call
}

// ✅ ĐÚNG — .getState() dùng được ở bất kỳ đâu
export function requireAuth() {
  const { isAuthenticated } = useAuthStore.getState(); // ✅
}
```

---

### ❌ Lỗi 3: Bật lại `ssr: true`

```ts
// ❌ SAI — Zustand sẽ crash toàn bộ auth flow
export default {
  ssr: true, // 💥 Hydration mismatch với Zustand
} satisfies Config;

// ✅ ĐÚNG
export default {
  ssr: false, // ✅ SPA Mode
} satisfies Config;
```

---

### ❌ Lỗi 4: Thêm route mới không đúng layout

```ts
// ❌ SAI — Route candidate nằm ngoài CandidateLayout
export default [
  layout("layouts/PublicLayout.tsx", [...]),
  route("candidate/profile", "routes/candidate/profile.tsx"), // ← Không có layout + guard
] satisfies RouteConfig;

// ✅ ĐÚNG — Route candidate phải nằm trong CandidateLayout
export default [
  layout("layouts/CandidateLayout.tsx", [
    ...prefix("candidate", [
      route("profile", "routes/candidate/profile.tsx"), // ← Đúng layout + guard
    ]),
  ]),
] satisfies RouteConfig;
```
