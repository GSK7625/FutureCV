import { useEffect, useState, type FormEvent } from "react";
import { IconCheck, IconPlus, IconTrash } from "@tabler/icons-react";
import { Button, Field, Input, Modal } from "~/components/ui";
import { useUIStore } from "~/stores/useUIStore";
import { toJobRequest, validateJobForm, type FieldErrors } from "../contracts/hrContracts";
import { useCreateEmployerJob, useHrMasterData, useUpdateEmployerJob } from "../hooks/useEmployerJobs";
import type { JobDetail, JobFormValues, JobSkillInput } from "../types";

const emptyJob: JobFormValues = {
  title: "",
  description: "",
  requirements: "",
  benefits: "",
  categoryId: "",
  levelId: "",
  employmentTypeId: "",
  locationId: "",
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "VND",
  experienceYearsMin: "",
  experienceYearsMax: "",
  deadline: "",
  positionsCount: "1",
  skills: [],
};

function valuesFromJob(job?: JobDetail | null): JobFormValues {
  if (!job) return emptyJob;
  return {
    title: job.title,
    description: job.description,
    requirements: job.requirements ?? "",
    benefits: job.benefits ?? "",
    categoryId: job.categoryId ?? "",
    levelId: job.levelId ?? "",
    employmentTypeId: job.employmentTypeId ?? "",
    locationId: job.locationId ?? "",
    salaryMin: job.salaryMin?.toString() ?? "",
    salaryMax: job.salaryMax?.toString() ?? "",
    salaryCurrency: job.salaryCurrency,
    experienceYearsMin: job.experienceYearsMin?.toString() ?? "",
    experienceYearsMax: job.experienceYearsMax?.toString() ?? "",
    deadline: job.deadline?.slice(0, 10) ?? "",
    positionsCount: job.positionsCount.toString(),
    skills: job.skills.map(({ skillId, isRequired }) => ({ skillId, isRequired })),
  };
}

export function JobFormModal({ open, onClose, job }: { open: boolean; onClose: () => void; job?: JobDetail | null }) {
  const [values, setValues] = useState<JobFormValues>(() => valuesFromJob(job));
  const [errors, setErrors] = useState<FieldErrors<JobFormValues>>({});
  const masterData = useHrMasterData();
  const createJob = useCreateEmployerJob();
  const updateJob = useUpdateEmployerJob();
  const showToast = useUIStore((state) => state.showToast);
  const mutation = job ? updateJob : createJob;

  useEffect(() => {
    if (open) {
      setValues(valuesFromJob(job));
      setErrors({});
    }
  }, [open, job]);

  const setField = (field: keyof JobFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const addSkill = (skillId: string) => {
    if (!skillId || values.skills.some((skill) => skill.skillId === skillId)) return;
    setValues((current) => ({ ...current, skills: [...current.skills, { skillId, isRequired: true }] }));
  };

  const updateSkill = (skillId: string, patch: Partial<JobSkillInput>) => {
    setValues((current) => ({
      ...current,
      skills: current.skills.map((skill) => skill.skillId === skillId ? { ...skill, ...patch } : skill),
    }));
  };

  const removeSkill = (skillId: string) => {
    setValues((current) => ({ ...current, skills: current.skills.filter((skill) => skill.skillId !== skillId) }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateJobForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    try {
      const input = toJobRequest(values);
      if (job) await updateJob.mutateAsync({ id: job.id, input });
      else await createJob.mutateAsync(input);
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Không thể lưu tin tuyển dụng", "error");
    }
  };

  const availableSkills = masterData.data?.skills.filter(
    (option) => !values.skills.some((skill) => skill.skillId === option.id),
  ) ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={job ? "Chỉnh sửa tin tuyển dụng" : "Tạo tin tuyển dụng"}
      className="max-h-[94dvh] max-w-4xl overflow-y-auto"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>Hủy</Button>
          <Button type="submit" form="job-form" disabled={mutation.isPending || masterData.isLoading}>
            <IconCheck size={18} aria-hidden="true" />
            {mutation.isPending ? "Đang lưu..." : job ? "Lưu thay đổi" : "Tạo tin"}
          </Button>
        </>
      }
    >
      <form id="job-form" className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit} noValidate>
        <Field label="Tiêu đề công việc" htmlFor="job-title" required error={errors.title} className="md:col-span-2">
          <Input id="job-title" value={values.title} onChange={(event) => setField("title", event.target.value)} error={errors.title} />
        </Field>
        <Field label="Mô tả công việc" htmlFor="job-description" required error={errors.description} className="md:col-span-2">
          <textarea id="job-description" rows={5} value={values.description} onChange={(event) => setField("description", event.target.value)} className="rounded-default border border-border-strong px-3.5 py-3 focus:border-gold focus:ring-2 focus:ring-gold/20" />
        </Field>
        <Field label="Yêu cầu" htmlFor="job-requirements" className="md:col-span-2">
          <textarea id="job-requirements" rows={4} value={values.requirements} onChange={(event) => setField("requirements", event.target.value)} className="rounded-default border border-border-strong px-3.5 py-3 focus:border-gold focus:ring-2 focus:ring-gold/20" />
        </Field>
        <Field label="Quyền lợi" htmlFor="job-benefits" className="md:col-span-2">
          <textarea id="job-benefits" rows={4} value={values.benefits} onChange={(event) => setField("benefits", event.target.value)} className="rounded-default border border-border-strong px-3.5 py-3 focus:border-gold focus:ring-2 focus:ring-gold/20" />
        </Field>

        <SelectField id="job-category" label="Ngành nghề" value={values.categoryId} onChange={(value) => setField("categoryId", value)} options={masterData.data?.categories ?? []} />
        <SelectField id="job-level" label="Cấp bậc" value={values.levelId} onChange={(value) => setField("levelId", value)} options={masterData.data?.levels ?? []} />
        <SelectField id="job-employment" label="Loại hình làm việc" value={values.employmentTypeId} onChange={(value) => setField("employmentTypeId", value)} options={masterData.data?.employmentTypes ?? []} />
        <SelectField id="job-location" label="Địa điểm" value={values.locationId} onChange={(value) => setField("locationId", value)} options={masterData.data?.locations ?? []} />

        <Field label="Lương tối thiểu" htmlFor="job-salary-min" error={errors.salaryMin}>
          <Input id="job-salary-min" type="number" min="0" value={values.salaryMin} onChange={(event) => setField("salaryMin", event.target.value)} error={errors.salaryMin} />
        </Field>
        <Field label="Lương tối đa" htmlFor="job-salary-max" error={errors.salaryMax}>
          <Input id="job-salary-max" type="number" min="0" value={values.salaryMax} onChange={(event) => setField("salaryMax", event.target.value)} error={errors.salaryMax} />
        </Field>
        <Field label="Đơn vị tiền" htmlFor="job-currency">
          <Input id="job-currency" value={values.salaryCurrency} onChange={(event) => setField("salaryCurrency", event.target.value.toUpperCase())} maxLength={10} />
        </Field>
        <Field label="Số lượng tuyển" htmlFor="job-positions" required error={errors.positionsCount}>
          <Input id="job-positions" type="number" min="1" step="1" value={values.positionsCount} onChange={(event) => setField("positionsCount", event.target.value)} error={errors.positionsCount} />
        </Field>
        <Field label="Kinh nghiệm tối thiểu" htmlFor="job-exp-min">
          <Input id="job-exp-min" type="number" value={values.experienceYearsMin} onChange={(event) => setField("experienceYearsMin", event.target.value)} />
        </Field>
        <Field label="Kinh nghiệm tối đa" htmlFor="job-exp-max" error={errors.experienceYearsMax}>
          <Input id="job-exp-max" type="number" value={values.experienceYearsMax} onChange={(event) => setField("experienceYearsMax", event.target.value)} error={errors.experienceYearsMax} />
        </Field>
        <Field label="Hạn nộp hồ sơ" htmlFor="job-deadline" error={errors.deadline}>
          <Input id="job-deadline" type="date" value={values.deadline} onChange={(event) => setField("deadline", event.target.value)} error={errors.deadline} />
        </Field>

        <Field label="Kỹ năng" htmlFor="job-skill-add" className="md:col-span-2" hint={masterData.isError ? "Không thể tải danh sách kỹ năng." : "Chọn kỹ năng và đánh dấu mức độ bắt buộc hoặc ưu tiên."}>
          <div className="flex gap-2">
            <select id="job-skill-add" defaultValue="" onChange={(event) => { addSkill(event.target.value); event.target.value = ""; }} className="h-11 min-w-0 flex-1 rounded-default border border-border-strong bg-white px-3.5 focus:border-gold">
              <option value="">Chọn kỹ năng</option>
              {availableSkills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
            </select>
            <span className="flex h-11 w-11 items-center justify-center rounded-default bg-surface-low text-ink-muted"><IconPlus size={18} aria-hidden="true" /></span>
          </div>
          {values.skills.length > 0 && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {values.skills.map((skill) => {
                const option = masterData.data?.skills.find((item) => item.id === skill.skillId);
                return (
                  <div key={skill.skillId} className="flex items-center gap-2 rounded-default border border-border-subtle bg-surface-low p-2">
                    <span className="min-w-0 flex-1 truncate text-label font-medium">{option?.name ?? skill.skillId}</span>
                    <select aria-label={`Mức độ ${option?.name ?? "kỹ năng"}`} value={skill.isRequired ? "required" : "preferred"} onChange={(event) => updateSkill(skill.skillId, { isRequired: event.target.value === "required" })} className="h-9 rounded-default border border-border-strong bg-white px-2 text-label-sm">
                      <option value="required">Bắt buộc</option>
                      <option value="preferred">Ưu tiên</option>
                    </select>
                    <button type="button" aria-label={`Xóa kỹ năng ${option?.name ?? "đã chọn"}`} onClick={() => removeSkill(skill.skillId)} className="flex h-9 w-9 items-center justify-center rounded-default text-danger hover:bg-danger/10">
                      <IconTrash size={17} aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Field>
      </form>
    </Modal>
  );
}

function SelectField({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (value: string) => void; options: { id: string; name: string }[] }) {
  return (
    <Field label={label} htmlFor={id}>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-default border border-border-strong bg-white px-3.5 text-ink focus:border-gold focus:ring-2 focus:ring-gold/20">
        <option value="">Chưa chọn</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </Field>
  );
}
