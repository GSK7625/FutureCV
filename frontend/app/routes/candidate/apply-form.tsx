import { useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { IconCircleCheck as CircleCheck, IconCloudUpload } from "@tabler/icons-react";
import { DEMO_JOBS } from "~/features/candidate/services/jobService";
import { useApplyJob } from "~/features/candidate/hooks/useApplyJob";
import { Field, Input, Button, Card, CardContent } from "~/components/ui";
import { useUIStore } from "~/stores/useUIStore";

export default function ApplyFormPage() {
  const { jobId = "" } = useParams();
  const showToast = useUIStore((s) => s.showToast);
  const apply = useApplyJob(jobId);
  const fileRef = useRef<HTMLInputElement>(null);

  const job = DEMO_JOBS.find((j) => String(j.id) === String(jobId)) ?? DEMO_JOBS[0];

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!fullName.trim()) next.fullName = "Vui lòng nhập họ và tên.";
    if (!email.trim()) next.email = "Vui lòng nhập email.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Email chưa đúng định dạng.";
    if (!phone.trim()) next.phone = "Vui lòng nhập số điện thoại.";
    if (!cvFile) next.cvFile = "Vui lòng đính kèm CV.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    apply.mutate(
      {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        coverLetter: coverLetter.trim() || undefined,
        cvFileName: cvFile!.name,
      },
      {
        onSuccess: () => setSubmitted(true),
        onError: (error) => showToast(error.message, "error"),
      },
    );
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <CardContent className="py-16 text-center">
            <CircleCheck size={56} stroke={1.4} className="mx-auto text-success" />
            <h1 className="mt-4 text-headline-md text-navy">Đã gửi hồ sơ ứng tuyển</h1>
            <p className="mt-2 text-ink-variant">
              Nhà tuyển dụng sẽ xem xét hồ sơ của bạn và phản hồi qua email trong vòng 7 ngày.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Link
                to="/jobs"
                className="inline-flex h-11 items-center rounded-default bg-navy px-6 font-semibold text-white transition-colors hover:bg-navy-secondary"
              >
                Tìm việc khác
              </Link>
              <Link
                to="/candidate/personal-info"
                className="inline-flex h-11 items-center rounded-default border border-navy px-6 font-semibold text-navy transition-colors hover:bg-navy hover:text-white"
              >
                Xem hồ sơ
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-3 flex items-center gap-2 text-label text-ink-variant" aria-label="Breadcrumb">
        <Link to="/jobs" className="hover:text-navy">Việc làm</Link>
        <span aria-hidden>/</span>
        {job && (
          <Link to={`/jobs/${jobId}`} className="hover:text-navy">
            {job.title}
          </Link>
        )}
        <span aria-hidden>/</span>
        <span className="font-semibold text-navy">Ứng tuyển</span>
      </nav>

      <h1 className="text-headline-md text-navy">Ứng tuyển vị trí</h1>
      {job && (
        <p className="mt-1 text-ink-variant">
          <strong className="text-navy">{job.title}</strong> tại {job.company}
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-6">
        <Card>
          <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Field label="Họ và tên" htmlFor="apply-name" error={errors.fullName} required>
              <Input
                id="apply-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
              />
            </Field>
            <Field label="Email" htmlFor="apply-email" error={errors.email} required>
              <Input
                id="apply-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@email.com"
              />
            </Field>
            <Field label="Số điện thoại" htmlFor="apply-phone" error={errors.phone} required className="md:col-span-2">
              <Input
                id="apply-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xx xxx xxx"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-6">
            <Field label="CV đính kèm" error={errors.cvFile} hint="Hỗ trợ PDF, DOC, DOCX tối đa 5MB." required>
              <div
                role="button"
                tabIndex={0}
                aria-label="Tải lên CV"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-default border border-dashed border-border-strong bg-surface-low px-6 py-10 text-center transition-colors hover:border-navy hover:bg-surface-low/70"
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
              >
                <IconCloudUpload size={36} stroke={1.4} className="text-navy" />
                {cvFile ? (
                  <p className="font-semibold text-navy">{cvFile.name}</p>
                ) : (
                  <p className="text-ink-variant">
                    Kéo thả file hoặc <span className="font-semibold text-navy underline">chọn từ thiết bị</span>
                  </p>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </Field>

            <Field label="Thư giới thiệu" htmlFor="apply-cover" hint="Chia sẻ vì sao bạn phù hợp với vị trí này.">
              <textarea
                id="apply-cover"
                rows={6}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Văn bản..."
                className="rounded-default border border-border-strong bg-white px-4 py-3 text-body text-ink outline-none transition-all placeholder:text-ink-muted/70 focus:border-navy focus:ring-2 focus:ring-navy/20"
              />
            </Field>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link to={`/candidate/jobs/${jobId}`}>
            <Button variant="ghost" size="lg">Hủy</Button>
          </Link>
          <Button type="submit" variant="accent" size="lg" disabled={apply.isPending}>
            {apply.isPending ? "Đang gửi hồ sơ..." : "Gửi hồ sơ ứng tuyển"}
          </Button>
        </div>
      </form>
    </div>
  );
}
