export function formatSalary(min?: number | null, max?: number | null, currency = "Triệu"): string {
  const toM = (v: number) => (v >= 1000 ? v / 1000 : v);
  if (min != null && max != null) return `${toM(min)} - ${toM(max)} ${currency}`;
  if (min != null) return `Từ ${toM(min)} ${currency}`;
  if (max != null) return `Lên đến ${toM(max)} ${currency}`;
  return "Thỏa thuận";
}

export function timeAgo(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Vừa đăng";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Đăng ${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Đăng ${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Đăng ${days} ngày trước`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `Đăng ${weeks} tuần trước`;
  const months = Math.floor(days / 30);
  return `Đăng ${months} tháng trước`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}
