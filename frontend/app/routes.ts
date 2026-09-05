import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  // ── Public Routes (Trang chủ & Việc làm) ─────────────────
  layout("layouts/PublicLayout.tsx", [
    index("routes/public/home.tsx"),
    route("jobs/:jobId", "routes/candidate/job-detail.tsx"),
    route("jobs/:jobId/apply", "routes/candidate/apply-form.tsx"),
    ...prefix("cv", [
      route("templates", "routes/candidate/cv-templates.tsx"),
      route("builder/:templateId", "routes/candidate/cv-builder.tsx"),
    ]),
  ]),

  // ── Auth Routes (Đăng nhập, Đăng ký, Quên mật khẩu) ─────
  layout("layouts/AuthLayout.tsx", [
    route("login", "routes/auth/login.tsx"),
    route("register", "routes/auth/register.tsx"),
    route("forgot-password", "routes/auth/forgot-password.tsx"),
  ]),

  // ── 404 Fallback ──────────────────────────────────────────
  route("*", "routes/public/not-found.tsx"),
] satisfies RouteConfig;
