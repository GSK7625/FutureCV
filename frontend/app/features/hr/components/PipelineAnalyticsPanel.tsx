import { Card, CardContent, Skeleton } from "~/components/ui";
import { QueryBoundary } from "~/components/shared/QueryBoundary";
import { usePipelineAnalytics } from "../hooks/useRecruiterApplications";
import { applicationStatusLabels } from "./ApplicationStatusBadge";

const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

export function PipelineAnalyticsPanel({ jobId }: { jobId: string }) {
  const query = usePipelineAnalytics(jobId);
  const data = query.data;
  return (
    <section className="mt-5" aria-label="Thống kê tuyển dụng theo tin">
      <QueryBoundary isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()} skeleton={<Skeleton className="h-64" />}>
        {data && <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Tổng hồ sơ", number.format(data.totalApplications)],
              ["Đang tuyển", number.format(data.activeApplications)],
              ["Đã tuyển", number.format(data.hiredCount)],
              ["Ứng viên quá hạn", number.format(data.overdueCandidatesCount)],
            ].map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-label text-ink-muted">{label}</p><p className="mt-2 text-headline-md font-semibold tabular-nums text-navy">{value}</p></CardContent></Card>)}
          </div>
          <Card className="mt-3"><CardContent className="p-5">
            <h2 className="font-semibold text-navy">Hiệu quả tuyển dụng</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Tỷ lệ tuyển thành công" value={`${number.format(data.overallConversionRate)}%`} />
              <Metric label="Thời gian tuyển trung bình" value={data.averageTimeToHireDays === null ? "Chưa có dữ liệu" : `${number.format(data.averageTimeToHireDays)} ngày`} />
              <Metric label="Đã từ chối / rút hồ sơ" value={`${data.rejectedCount} / ${data.withdrawnCount}`} />
              <Metric label="Stage cần theo dõi" value={data.bottleneckStage ? applicationStatusLabels[data.bottleneckStage] : "Chưa có"} />
            </dl>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div><h3 className="text-label font-semibold text-navy">Chuyển đổi giữa các stage</h3><ul className="mt-3 space-y-2">{data.stageConversionRates.map((item) => <li key={`${item.fromStage}-${item.toStage}`} className="flex flex-wrap justify-between gap-2 rounded-default bg-surface-low px-3 py-2 text-label"><span>{applicationStatusLabels[item.fromStage]} → {applicationStatusLabels[item.toStage]}</span><span className="tabular-nums">{item.toCount}/{item.fromCount} · {number.format(item.conversionRate)}%</span></li>)}</ul></div>
              <div><h3 className="text-label font-semibold text-navy">Thời gian tại từng stage</h3><ul className="mt-3 space-y-2">{data.stageAverageDurations.map((item) => <li key={item.stage} className="flex flex-wrap justify-between gap-2 rounded-default bg-surface-low px-3 py-2 text-label"><span>{applicationStatusLabels[item.stage]} · {item.candidateCount} ứng viên</span><span className="tabular-nums">{number.format(item.averageDays)} ngày · {item.overdueCount} quá hạn</span></li>)}</ul></div>
            </div>
          </CardContent></Card>
        </>}
      </QueryBoundary>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-label text-ink-muted">{label}</dt><dd className="mt-1 font-semibold text-navy">{value}</dd></div>;
}
