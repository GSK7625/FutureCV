import { type RouteConfig, index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  layout("layouts/PublicLayout.tsx", [
    index("routes/public/home.tsx"),
    route("about", "routes/public/about.tsx"),
    route("contact", "routes/public/contact.tsx"),
  ]),
  layout("layouts/AuthLayout.tsx", [
    route("login", "routes/auth/login.tsx"),
    route("register", "routes/auth/register.tsx"),
    route("forgot-password", "routes/auth/forgot-password.tsx"),
  ]),
  layout("layouts/CandidateLayout.tsx", [
    ...prefix("candidate", [
      index("routes/candidate/job-list.tsx"),
      route("jobs/:jobId", "routes/candidate/job-detail.tsx"),
      route("jobs/:jobId/apply", "routes/candidate/apply-form.tsx"),
      route("profile", "routes/candidate/profile.tsx"),
    ]),
  ]),
  layout("layouts/HRLayout.tsx", [
    ...prefix("hr", [
      index("routes/hr/dashboard.tsx"),
      route("jobs", "routes/hr/job-management.tsx"),
      route("candidates", "routes/hr/candidate-pipeline.tsx"),
      route("interviews", "routes/hr/interview.tsx"),
    ]),
  ]),
  layout("layouts/AdminLayout.tsx", [
    ...prefix("admin", [
      index("routes/admin/dashboard.tsx"),
      route("users", "routes/admin/user-management.tsx"),
      route("roles", "routes/admin/role-permission.tsx"),
      route("settings", "routes/admin/system-config.tsx"),
    ]),
  ]),
  route("*", "routes/public/not-found.tsx"),
] satisfies RouteConfig;
