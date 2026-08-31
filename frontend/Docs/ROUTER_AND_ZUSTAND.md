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

> Ghi chú: Candidate **không có dashboard**. `/candidate` là trang tìm kiếm việc làm (index → job-list).

```
app/routes.ts
├── layout PublicLayout
│   ├── index                → routes/public/home.tsx            (/)
│   ├── about                → routes/public/about.tsx           (/about)
│   └── contact              → routes/public/contact.tsx         (/contact)
├── layout AuthLayout
│   ├── login                → routes/auth/login.tsx             (/login)
│   ├── register             → routes/auth/register.tsx          (/register)
│   └── forgot-password      → routes/auth/forgot-password.tsx   (/forgot-password)
├── layout CandidateLayout   (clientLoader → requireRole(['candidate']))
│   ├── candidate            → routes/candidate/job-list.tsx     (/candidate)
│   ├── candidate/jobs/:jobId          → routes/candidate/job-detail.tsx
│   ├── candidate/jobs/:jobId/apply    → routes/candidate/apply-form.tsx
│   └── candidate/profile              → routes/candidate/profile.tsx
├── layout HRLayout          (placeholder tối giản)
│   ├── hr                   → routes/hr/dashboard.tsx
│   ├── hr/jobs              → routes/hr/job-management.tsx
│   ├── hr/candidates        → routes/hr/candidate-pipeline.tsx
│   └── hr/interviews        → routes/hr/interview.tsx
├── layout AdminLayout       (placeholder tối giản)
│   ├── admin                → routes/admin/dashboard.tsx
│   ├── admin/users          → routes/admin/user-management.tsx
│   ├── admin/roles          → routes/admin/role-permission.tsx
│   └── admin/settings       → routes/admin/system-config.tsx
└── *                        → routes/public/not-found.tsx       (404)
```

## Bảng URL toàn dự án

| URL | Route | Layout | Guard |
|---|---|---|---|
| `/` | home | PublicLayout | công khai |
| `/about` | about | PublicLayout | công khai |
| `/contact` | contact | PublicLayout | công khai |
| `/login` | login | AuthLayout | đã login → redirect `/` |
| `/register` | register | AuthLayout | đã login → redirect `/` |
| `/forgot-password` | forgot-password | AuthLayout | công khai |
| `/candidate` | job-list | CandidateLayout | `requireRole(['candidate'])` |
| `/candidate/jobs/:jobId` | job-detail | CandidateLayout | `requireRole(['candidate'])` |
| `/candidate/jobs/:jobId/apply` | apply-form | CandidateLayout | `requireRole(['candidate'])` |
| `/candidate/profile` | profile | CandidateLayout | `requireRole(['candidate'])` |
| `/hr`, `/hr/*` | placeholder | HRLayout | `requireRole(['employer'])` |
| `/admin`, `/admin/*` | placeholder | AdminLayout | `requireRole(['admin'])` |
| URL khác | not-found | - | 404 |

## Zustand — Code mẫu

```ts
// app/stores/useAuthStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setSession: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: "futurecv-auth",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
```

## Guards — Bảo vệ route đúng cách

```ts
// app/guards/requireRole.ts
// Guard ngoài component (clientLoader): PHẢI dùng .getState(), KHÔNG dùng hook.
export function requireRole(roles: Role[]) {
  const { user } = requireAuth(); // bên trong dùng useAuthStore.getState()
  if (!roles.includes(user.role)) throw redirect("/");
  return { user };
}

// Sử dụng trong route:
export const clientLoader = (args: Route.ClientLoaderArgs) => {
  requireRole(["candidate"]);
  return { keyword: new URL(args.request.url).searchParams.get("q") ?? "" };
};
```

## Các lỗi thường gặp

- **Đổi `ssr: true`** khi đang dùng Zustand persist → hydration mismatch.
- **Gọi hook (`useAuthStore`) trong guard/loader** ngoài component → runtime error. Luôn dùng `useAuthStore.getState()`.
- **Route nằm ngoài mọi layout** → thiếu navbar/footer hoặc shell. Mọi route phải nằm trong một `layout()`.

