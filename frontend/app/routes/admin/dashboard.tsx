import { IconUsers, IconBuilding, IconBriefcase, IconFileText, IconTrendingUp, IconAlertCircle } from "@tabler/icons-react";
import { useAuthStore } from "~/stores/useAuthStore";
import { useDashboardStats } from "~/features/admin/hooks/useAdminQueries";

export default function AdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const { data: stats, isLoading, error } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-navy border-r-transparent"></div>
          <p className="text-ink-muted">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <IconAlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <p className="text-headline-sm text-navy">Không thể tải dữ liệu</p>
          <p className="mt-2 text-ink-muted">Vui lòng thử lại sau</p>
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby="dashboard-title">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-label font-semibold text-gold">ADMIN DASHBOARD</p>
          <h1 id="dashboard-title" className="mt-1 text-headline text-navy">
            Xin chào, {user?.fullName || "Admin"}
          </h1>
          <p className="mt-2 text-ink-variant">
            Theo dõi hoạt động và số liệu quan trọng của hệ thống
          </p>
        </div>
      </div>

      <div className="mt-7 space-y-8">
        {/* User Stats */}
        <section>
          <h2 className="mb-4 text-headline-sm font-semibold text-navy">Người dùng</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<IconUsers size={22} />}
              label="Tổng người dùng"
              value={stats.totalUsers}
            />
            <StatCard
              icon={<IconUsers size={22} />}
              label="Ứng viên"
              value={stats.totalCandidates}
            />
            <StatCard
              icon={<IconUsers size={22} />}
              label="Nhà tuyển dụng"
              value={stats.totalEmployers}
            />
            <StatCard
              icon={<IconAlertCircle size={22} />}
              label="Tài khoản bị khóa"
              value={stats.lockedUsers}
            />
          </div>
        </section>

        {/* Company Stats */}
        <section>
          <h2 className="mb-4 text-headline-sm font-semibold text-navy">Công ty</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<IconBuilding size={22} />}
              label="Tổng công ty"
              value={stats.totalCompanies}
            />
            <StatCard
              icon={<IconBuilding size={22} />}
              label="Đã xác minh"
              value={stats.verifiedCompanies}
            />
            <StatCard
              icon={<IconBuilding size={22} />}
              label="Chờ xác minh"
              value={stats.pendingCompanies}
            />
            <StatCard
              icon={<IconBuilding size={22} />}
              label="Từ chối"
              value={stats.rejectedCompanies}
            />
          </div>
        </section>

        {/* Job Stats */}
        <section>
          <h2 className="mb-4 text-headline-sm font-semibold text-navy">Tin tuyển dụng</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<IconBriefcase size={22} />}
              label="Tổng tin tuyển dụng"
              value={stats.totalJobs}
            />
            <StatCard
              icon={<IconBriefcase size={22} />}
              label="Đang hoạt động"
              value={stats.activeJobs}
            />
            <StatCard
              icon={<IconBriefcase size={22} />}
              label="Chờ duyệt"
              value={stats.pendingJobs}
            />
            <StatCard
              icon={<IconFileText size={22} />}
              label="Tổng ứng tuyển"
              value={stats.totalApplications}
            />
          </div>
        </section>

        {/* Growth Charts */}
        <section className="grid gap-6 lg:grid-cols-2">
          <GrowthCard
            title="Người dùng mới (7 ngày)"
            data={stats.userGrowthLast7Days}
            icon={<IconTrendingUp size={20} />}
            color="blue"
          />
          <GrowthCard
            title="Tin tuyển dụng mới (7 ngày)"
            data={stats.jobGrowthLast7Days}
            icon={<IconTrendingUp size={20} />}
            color="teal"
          />
        </section>
      </div>
    </section>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-default border border-border-subtle bg-surface p-5 shadow-surface">
      <div className="flex items-center justify-between">
        <p className="text-label font-medium text-ink-muted">{label}</p>
        <span className="flex h-10 w-10 items-center justify-center rounded-default bg-navy/10 text-navy">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-headline tabular-nums text-navy">
        {new Intl.NumberFormat("vi-VN").format(value)}
      </p>
    </div>
  );
}

interface GrowthCardProps {
  title: string;
  data: Array<{ date: string; count: number }>;
  icon: React.ReactNode;
  color: "blue" | "teal";
}

function GrowthCard({ title, data, icon, color }: GrowthCardProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const colorClasses = {
    blue: "bg-blue-500",
    teal: "bg-teal-500",
  };

  return (
    <div className="rounded-default border border-border-subtle bg-surface p-6 shadow-surface">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-ink-muted">{icon}</div>
          <h3 className="text-headline-sm font-semibold text-navy">{title}</h3>
        </div>
        <p className="text-headline-lg font-bold text-navy">{total}</p>
      </div>

      <div className="mt-6 flex items-end gap-2" style={{ height: "120px" }}>
        {data.map((item, index) => {
          const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
          const bgColor = color === "blue" ? "bg-blue-500" : "bg-teal-500";
          return (
            <div key={index} className="flex flex-1 flex-col items-center gap-2">
              <div className="relative w-full flex-1">
                <div
                  className={`absolute bottom-0 w-full rounded-sm transition-all ${bgColor}`}
                  style={{ height: `${height}%` }}
                  title={`${item.count}`}
                />
              </div>
              <div className="text-label-xs text-ink-muted">
                {new Date(item.date).getDate()}/{new Date(item.date).getMonth() + 1}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
