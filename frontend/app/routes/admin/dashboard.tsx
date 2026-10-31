import { IconUsers, IconBriefcase, IconBuildingSkyscraper, IconFileText } from "@tabler/icons-react";
import { Card, CardContent, CardHeader } from "~/components/ui/Card";
import { Badge } from "~/components/ui/Badge";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
}

function StatCard({ icon, label, value, trend, trendUp }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy/10 text-navy">
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-label-sm text-ink-muted">{label}</p>
          <p className="mt-1 text-headline-lg font-bold text-ink">{value}</p>
          {trend && (
            <p className={`mt-1 text-label-sm ${trendUp ? "text-success" : "text-danger"}`}>
              {trendUp ? "↑" : "↓"} {trend}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-headline-xl font-bold text-ink">Tổng quan hệ thống</h1>
        <p className="mt-2 text-body-md text-ink-muted">
          Theo dõi hoạt động và thống kê của nền tảng FutureCV
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<IconUsers size={24} />}
          label="Tổng người dùng"
          value="2,847"
          trend="+12% so với tháng trước"
          trendUp={true}
        />
        <StatCard
          icon={<IconBuildingSkyscraper size={24} />}
          label="Nhà tuyển dụng"
          value="156"
          trend="+8% so với tháng trước"
          trendUp={true}
        />
        <StatCard
          icon={<IconBriefcase size={24} />}
          label="Việc làm đang tuyển"
          value="423"
          trend="-3% so với tháng trước"
          trendUp={false}
        />
        <StatCard
          icon={<IconFileText size={24} />}
          label="CV đã tạo"
          value="1,654"
          trend="+15% so với tháng trước"
          trendUp={true}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-headline-md font-semibold text-ink">Hoạt động gần đây</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { user: "Nguyễn Văn A", action: "đã đăng ký tài khoản ứng viên", time: "5 phút trước" },
                { user: "Công ty ABC", action: "đăng tin tuyển dụng mới", time: "12 phút trước" },
                { user: "Trần Thị B", action: "tạo CV mới", time: "25 phút trước" },
                { user: "Công ty XYZ", action: "cập nhật thông tin công ty", time: "1 giờ trước" },
                { user: "Lê Văn C", action: "ứng tuyển vị trí Developer", time: "2 giờ trước" },
              ].map((activity, index) => (
                <div key={index} className="flex items-start gap-3 border-b border-border-subtle pb-4 last:border-0 last:pb-0">
                  <div className="h-8 w-8 rounded-full bg-surface-high" />
                  <div className="flex-1">
                    <p className="text-body-sm text-ink">
                      <span className="font-semibold">{activity.user}</span> {activity.action}
                    </p>
                    <p className="mt-1 text-label-sm text-ink-muted">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-headline-md font-semibold text-ink">Tin tuyển dụng phổ biến</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: "Senior Frontend Developer", company: "Công ty TNHH ABC", views: 245, applications: 18 },
                { title: "Backend Developer (Node.js)", company: "Công ty CP XYZ", views: 198, applications: 14 },
                { title: "UI/UX Designer", company: "Startup Tech", views: 176, applications: 22 },
                { title: "DevOps Engineer", company: "FPT Software", views: 152, applications: 9 },
                { title: "Full-stack Developer", company: "VNG Corporation", views: 134, applications: 11 },
              ].map((job, index) => (
                <div key={index} className="border-b border-border-subtle pb-4 last:border-0 last:pb-0">
                  <h3 className="text-body-md font-semibold text-ink">{job.title}</h3>
                  <p className="mt-1 text-label-sm text-ink-muted">{job.company}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <Badge variant="neutral" shape="pill">
                      {job.views} lượt xem
                    </Badge>
                    <Badge variant="navy" shape="pill">
                      {job.applications} ứng tuyển
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-headline-md font-semibold text-ink">Thống kê theo tháng</h2>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-default border border-border-subtle bg-surface-low p-4">
              <p className="text-label-sm text-ink-muted">Người dùng mới</p>
              <p className="mt-2 text-headline-lg font-bold text-ink">342</p>
              <p className="mt-1 text-label-sm text-success">+18% so với tháng trước</p>
            </div>
            <div className="rounded-default border border-border-subtle bg-surface-low p-4">
              <p className="text-label-sm text-ink-muted">Tin đăng tuyển mới</p>
              <p className="mt-2 text-headline-lg font-bold text-ink">67</p>
              <p className="mt-1 text-label-sm text-success">+12% so với tháng trước</p>
            </div>
            <div className="rounded-default border border-border-subtle bg-surface-low p-4">
              <p className="text-label-sm text-ink-muted">Tổng ứng tuyển</p>
              <p className="mt-2 text-headline-lg font-bold text-ink">1,248</p>
              <p className="mt-1 text-label-sm text-success">+22% so với tháng trước</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

