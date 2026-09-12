import type { ReactNode } from "react";
import { cn } from "~/lib/cn";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  className?: string;
}

export function StatsCard({ title, value, icon, trend, subtitle, className }: StatsCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-surface p-6 transition-all hover:border-navy/20 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-label-sm text-ink-variant">{title}</p>
          <p className="mt-2 text-headline-lg font-semibold text-navy">{value}</p>
          {subtitle && <p className="mt-1 text-label-sm text-ink-muted">{subtitle}</p>}
          {trend && (
            <div className="mt-3 flex items-center gap-1">
              <span
                className={cn(
                  "text-label-sm font-medium",
                  trend.isPositive ? "text-success" : "text-danger",
                )}
              >
                {trend.isPositive ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-label-sm text-ink-muted">so với tuần trước</span>
            </div>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy/5 text-navy transition-colors group-hover:bg-navy/10">
          {icon}
        </div>
      </div>
    </div>
  );
}
