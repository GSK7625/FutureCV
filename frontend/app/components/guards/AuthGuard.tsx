import React from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * AuthGuard component - Protects routes requiring authentication
 * Uses React Router loader for server-side protection via requireAuth()
 * This component is for client-side UI only
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  // Auth check is handled by loader (requireAuth)
  // This component just renders children
  return <>{children}</>;
}

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

/**
 * RoleGuard component - Protects routes requiring specific roles
 * Uses React Router loader for server-side protection via requireRole()
 * This component is for client-side UI only
 */
export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  // Role check is handled by loader (requireRole)
  // This component just renders children
  return <>{children}</>;
}
