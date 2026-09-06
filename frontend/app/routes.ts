import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // Public routes
  index("routes/public/home.tsx"),
  route("public/about", "routes/public/about.tsx"),
  
  // Auth routes
  route("auth/login", "routes/auth/login.tsx"),
  route("auth/register", "routes/auth/register.tsx"),
  
  // Admin routes
  route("admin/dashboard", "routes/admin/dashboard.tsx"),
  
  // Candidate routes
  route("candidate/dashboard", "routes/candidate/dashboard.tsx"),
  
  // HR routes
  route("hr/dashboard", "routes/hr/dashboard.tsx"),
  route("hr/jobs", "routes/hr/job-management.tsx"),
] satisfies RouteConfig;
