import { cn } from "~/lib/cn";
import type { ApplicationStatus, UpdatableApplicationStatus } from "../types";

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  Applied: "Đã ứng tuyển",
  Screening: "Sàng lọc",
  Interview: "Phỏng vấn",
  Offer: "Đề nghị",
  Hired: "Đã tuyển",
  Rejected: "Từ chối",
  Withdrawn: "Đã rút",
};

export const updatableApplicationStatuses: UpdatableApplicationStatus[] = [
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
];

export interface StatusTheme {
  label: string;
  dotColor: string;
  topBorder: string;
  badge: string;
  countPill: string;
  dropZoneBorder: string;
  dropZoneBg: string;
  dropZoneText: string;
  cardBorder: string;
  cardActiveRing: string;
  cardActiveBg: string;
}

export const statusThemeConfig: Record<ApplicationStatus, StatusTheme> = {
  Applied: {
    label: "Đã ứng tuyển",
    dotColor: "bg-sky-500",
    topBorder: "border-t-sky-500",
    badge: "bg-sky-50 text-sky-700 border-sky-200/80",
    countPill: "bg-sky-100/80 text-sky-800 border-sky-200",
    dropZoneBorder: "border-sky-400",
    dropZoneBg: "bg-sky-50/70",
    dropZoneText: "text-sky-700",
    cardBorder: "hover:border-sky-300",
    cardActiveRing: "ring-sky-400/40",
    cardActiveBg: "bg-sky-500/[0.04]",
  },
  Screening: {
    label: "Sàng lọc",
    dotColor: "bg-indigo-500",
    topBorder: "border-t-indigo-500",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    countPill: "bg-indigo-100/80 text-indigo-800 border-indigo-200",
    dropZoneBorder: "border-indigo-400",
    dropZoneBg: "bg-indigo-50/70",
    dropZoneText: "text-indigo-700",
    cardBorder: "hover:border-indigo-300",
    cardActiveRing: "ring-indigo-400/40",
    cardActiveBg: "bg-indigo-500/[0.04]",
  },
  Interview: {
    label: "Phỏng vấn",
    dotColor: "bg-amber-500",
    topBorder: "border-t-amber-500",
    badge: "bg-amber-50 text-amber-800 border-amber-200/80",
    countPill: "bg-amber-100/80 text-amber-900 border-amber-200",
    dropZoneBorder: "border-amber-400",
    dropZoneBg: "bg-amber-50/70",
    dropZoneText: "text-amber-800",
    cardBorder: "hover:border-amber-300",
    cardActiveRing: "ring-amber-400/40",
    cardActiveBg: "bg-amber-500/[0.04]",
  },
  Offer: {
    label: "Đề nghị",
    dotColor: "bg-teal-500",
    topBorder: "border-t-teal-500",
    badge: "bg-teal-50 text-teal-800 border-teal-200/80",
    countPill: "bg-teal-100/80 text-teal-900 border-teal-200",
    dropZoneBorder: "border-teal-400",
    dropZoneBg: "bg-teal-50/70",
    dropZoneText: "text-teal-800",
    cardBorder: "hover:border-teal-300",
    cardActiveRing: "ring-teal-400/40",
    cardActiveBg: "bg-teal-500/[0.04]",
  },
  Hired: {
    label: "Đã tuyển",
    dotColor: "bg-emerald-500",
    topBorder: "border-t-emerald-500",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    countPill: "bg-emerald-100/80 text-emerald-900 border-emerald-200",
    dropZoneBorder: "border-emerald-400",
    dropZoneBg: "bg-emerald-50/70",
    dropZoneText: "text-emerald-800",
    cardBorder: "hover:border-emerald-300",
    cardActiveRing: "ring-emerald-400/40",
    cardActiveBg: "bg-emerald-500/[0.04]",
  },
  Rejected: {
    label: "Từ chối",
    dotColor: "bg-rose-500",
    topBorder: "border-t-rose-500",
    badge: "bg-rose-50 text-rose-700 border-rose-200/80",
    countPill: "bg-rose-100/80 text-rose-800 border-rose-200",
    dropZoneBorder: "border-rose-400",
    dropZoneBg: "bg-rose-50/70",
    dropZoneText: "text-rose-700",
    cardBorder: "hover:border-rose-300",
    cardActiveRing: "ring-rose-400/40",
    cardActiveBg: "bg-rose-500/[0.04]",
  },
  Withdrawn: {
    label: "Đã rút",
    dotColor: "bg-slate-400",
    topBorder: "border-t-slate-400",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    countPill: "bg-slate-100 text-slate-700 border-slate-200",
    dropZoneBorder: "border-slate-400",
    dropZoneBg: "bg-slate-50",
    dropZoneText: "text-slate-600",
    cardBorder: "hover:border-slate-300",
    cardActiveRing: "ring-slate-400/40",
    cardActiveBg: "bg-slate-500/[0.04]",
  },
};

export function ApplicationStatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  const theme = statusThemeConfig[status] ?? statusThemeConfig.Applied;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-semibold border shadow-2xs",
        theme.badge,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", theme.dotColor)} aria-hidden="true" />
      {applicationStatusLabels[status]}
    </span>
  );
}
