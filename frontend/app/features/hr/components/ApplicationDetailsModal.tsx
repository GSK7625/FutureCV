import { useEffect, useState, type FormEvent } from "react";
import { IconExternalLink } from "@tabler/icons-react";
import { Button, Card, CardContent, Field, Modal, Skeleton } from "~/components/ui";
import { QueryBoundary } from "~/components/shared/QueryBoundary";
import { useUIStore } from "~/stores/useUIStore";
import {
  toSafeDocumentUrl,
  toStatusUpdateRequest,
  validateStatusReason,
} from "../contracts/hrContracts";
import {
  useRecruiterApplication,
  useUpdateApplicationStatus,
} from "../hooks/useRecruiterApplications";
import type { UpdatableApplicationStatus } from "../types";
import { ApplicationStatusBadge, applicationStatusLabels, updatableApplicationStatuses } from "./ApplicationStatusBadge";

export function ApplicationDetailsModal({ applicationId, onClose }: { applicationId: string | null; onClose: () => void }) {
  const applicationQuery = useRecruiterApplication(applicationId);
  const updateStatus = useUpdateApplicationStatus();
  const showToast = useUIStore((state) => state.showToast);
  const [status, setStatus] = useState<UpdatableApplicationStatus>("Screening");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string>();

  useEffect(() => {
    const application = applicationQuery.data;
    if (!application) return;
    if (application.status !== "Withdrawn") setStatus(application.status);
    setReason("");
    setReasonError(undefined);
  }, [applicationQuery.data]);

  const saveStatus = async (event: FormEvent) => {
    event.preventDefault();
    const error = validateStatusReason(reason);
    setReasonError(error);
    if (error || !applicationId) return;
    if (status === applicationQuery.data?.status) {
      showToast("Hãy chọn trạng thái khác trạng thái hiện tại", "error");
      return;
    }
    try {
      await updateStatus.mutateAsync({ id: applicationId, input: toStatusUpdateRequest(status, reason) });
    } catch (mutationError) {
      showToast(mutationError instanceof Error ? mutationError.message : "Không thể cập nhật trạng thái", "error");
    }
  };

  const application = applicationQuery.data;
  const cvUrl = toSafeDocumentUrl(application?.cvFileUrl);
  return (
    <Modal open={Boolean(applicationId)} onClose={onClose} title="Chi tiết ứng viên" className="max-h-[94dvh] max-w-5xl overflow-y-auto">
      <QueryBoundary isLoading={applicationQuery.isLoading} error={applicationQuery.error} onRetry={() => applicationQuery.refetch()} skeleton={<div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-52" /><Skeleton className="h-40" /></div>}>
        {application && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-headline-md text-navy">{application.candidateFullName}</h3>
                <p className="mt-1 break-words text-ink-variant">{application.candidatePhone ?? "Chưa có số điện thoại"}</p>
                <p className="mt-1 text-label text-ink-muted">Ứng tuyển {application.jobTitle} ngày {new Date(application.appliedAt).toLocaleDateString("vi-VN")}</p>
              </div>
              <ApplicationStatusBadge status={application.status} />
            </div>

            <Card><CardContent className="p-5"><h4 className="font-semibold text-navy">CV và thư ứng tuyển</h4><p className="mt-3 text-label text-ink-muted">{application.cvTitle ?? "CV ứng tuyển"}</p>{cvUrl ? <a href={cvUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-navy hover:text-gold">Mở CV<IconExternalLink size={18} aria-hidden="true" /></a> : <p className="mt-3 text-ink-variant">Không tìm thấy liên kết CV hợp lệ.</p>}<p className="mt-4 whitespace-pre-wrap text-ink-variant">{application.coverLetter || "Ứng viên không gửi thư ứng tuyển."}</p></CardContent></Card>

            <form onSubmit={saveStatus} className="rounded-default border border-border-subtle bg-surface p-5">
              <h4 className="font-semibold text-navy">Trạng thái tuyển dụng</h4>
              {application.status === "Withdrawn" ? <p className="mt-4 text-ink-variant">Ứng viên đã rút hồ sơ nên không thể cập nhật trạng thái.</p> : <div className="mt-4 space-y-4"><Field label="Trạng thái mới" htmlFor="application-status"><select id="application-status" value={status} onChange={(event) => setStatus(event.target.value as UpdatableApplicationStatus)} className="h-11 w-full rounded-default border border-border-strong bg-white px-3.5 focus:border-gold">{updatableApplicationStatuses.map((value) => <option key={value} value={value}>{applicationStatusLabels[value]}</option>)}</select></Field><Field label="Lý do" htmlFor="application-reason" error={reasonError} hint="Không bắt buộc, tối đa 500 ký tự."><textarea id="application-reason" rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded-default border border-border-strong px-3.5 py-3 focus:border-gold" /></Field><Button type="submit" disabled={updateStatus.isPending}>{updateStatus.isPending ? "Đang cập nhật..." : "Cập nhật trạng thái"}</Button></div>}
            </form>

            <div><h4 className="font-semibold text-navy">Lịch sử trạng thái</h4>{application.timeline.length ? <ol className="mt-4 space-y-3 border-l-2 border-border-subtle pl-5">{application.timeline.map((item, index) => { const reason = formatTimelineReason(item.reason); return <li key={`${item.changedAt}-${index}`}><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-navy">{applicationStatusLabels[item.toStatus]}</span><span className="text-label text-ink-muted">{new Date(item.changedAt).toLocaleString("vi-VN")}</span></div>{reason && <p className="mt-1 text-label text-ink-variant">{reason}</p>}</li>; })}</ol> : <p className="mt-3 text-ink-muted">Chưa có lịch sử thay đổi.</p>}</div>
          </div>
        )}
      </QueryBoundary>
    </Modal>
  );
}

function formatTimelineReason(reason?: string | null): string | null {
  if (!reason?.trim()) return null;
  const trimmed = reason.trim();
  if (["initial application submission", "candidate withdrew application"].includes(trimmed.toLowerCase())) return null;
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(trimmed) ? trimmed : null;
}
