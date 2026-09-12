import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  // ── Public Routes (Trang chủ & Việc làm & CV) ─────────────
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
    route("register/employer", "routes/auth/register-employer.tsx"),
    route("forgot-password", "routes/auth/forgot-password.tsx"),
    route("reset-password", "routes/auth/reset-password.tsx"),
  ]),

  // ── Candidate Protected Routes ─────────────────────────────
  ...prefix("candidate", [
    layout("layouts/CandidateLayout.tsx", [
      index("routes/candidate/job-list.tsx"),
      route("personal-info", "routes/candidate/personal-info.tsx"),
      route("security", "routes/candidate/security.tsx"),
      route("email-settings", "routes/candidate/email-settings.tsx"),
      route("job-alerts", "routes/candidate/job-alerts.tsx"),
      route("notifications", "routes/candidate/notifications.tsx"),
      route("change-password", "routes/candidate/change-password.tsx"),
    ]),
  ]),

  // ── HR Protected Routes ───────────────────────────────────
  ...prefix("hr", [
    layout("layouts/HRLayout.tsx", [
      index("routes/hr/dashboard.tsx"),
      route("jobs", "routes/hr/job-management.tsx"),
      route("pipeline", "routes/hr/candidate-pipeline.tsx"),
      route("interviews", "routes/hr/interview.tsx"),
      route("company", "routes/hr/company-profile.tsx"),
      route("profile", "routes/hr/recruiter-profile.tsx"),
    ]),
  ]),

  // ── Admin Protected Routes ────────────────────────────────
  ...prefix("admin", [
    layout("layouts/AdminLayout.tsx", [
      index("routes/admin/dashboard.tsx"),
      route("users", "routes/admin/user-management.tsx"),
      route("roles", "routes/admin/role-permission.tsx"),
      route("config", "routes/admin/system-config.tsx"),
    ]),
  ]),

  // ── 404 Fallback ──────────────────────────────────────────
  route("*", "routes/public/not-found.tsx"),
] satisfies RouteConfig;
