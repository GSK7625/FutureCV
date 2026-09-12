import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  IconPencil,
  IconDeviceFloppy,
  IconX,
  IconUser,
  IconBriefcase,
  IconFileText,
  IconShieldCheck,
} from "@tabler/icons-react";
import { candidateQueryKeys } from "~/features/candidate/queries/candidateQueryKeys";
import { useAuthStore } from "~/stores/useAuthStore";
import { useUIStore } from "~/stores/useUIStore";
import { Avatar } from "~/components/ui/Avatar";
import { Badge } from "~/components/ui/Badge";
import { Button } from "~/components/ui/Button";
import { Card, CardContent, CardHeader } from "~/components/ui/Card";
import { Field, Input } from "~/components/ui/Input";

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  headline: string;
  experienceYears: string;
  skills: string[];
  cvFileName?: string;
}

const defaultProfile: ProfileData = {
  fullName: "Nguyễn Văn A",
  email: "ungvien@futurecv.vn",
  phone: "0912 345 678",
  headline: "Software Engineer tại FutureCV",
  experienceYears: "3",
  skills: ["React", "TypeScript", "Node.js"],
  cvFileName: "CV_NguyenVanA.pdf",
};

function completion(p: ProfileData): number {
  const checks = [
    Boolean(p.fullName),
    Boolean(p.email),
    Boolean(p.phone),
    Boolean(p.headline),
    Boolean(p.experienceYears),
    p.skills.length > 0,
    Boolean(p.cvFileName),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [editing, setEditing] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [newSkill, setNewSkill] = useState("");

  const percent = completion(profile);

  const startEdit = () => {
    setEditing(true);
  };

  const save = () => {
    if (newSkill.trim()) {
      setProfile((p) => ({ ...p, skills: [...p.skills, newSkill.trim()] }));
      setNewSkill("");
    }
    setEditing(false);
    showToast("Đã lưu thay đổi hồ sơ", "success");
  };

  const cancel = () => {
    setEditing(false);
    setNewSkill("");
  };

  const addSkill = () => {
    if (!skillInput.trim()) return;
    setProfile((p) => ({ ...p, skills: [...p.skills, skillInput.trim()] }));
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setProfile((p) => ({ ...p, skills: p.skills.filter((s) => s !== skill) }));
  };

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-headline-md text-navy">Hồ sơ ứng viên</h1>
      <p className="mt-1 text-ink-variant">
        Hồ sơ càng đầy đủ, cơ hội được nhà tuyển dụng chú ý càng cao.
      </p>

      {/* Completion progress: track navy 8px, fill gold */}
      <Card className="mt-6">
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-navy">Mức độ hoàn thành hồ sơ</h2>
            <span className="font-bold text-navy">{percent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-navy/10">
            <div
              className="h-full rounded-full bg-gold transition-all duration-500"
              style={{ width: `${percent}%` }}
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-label-sm">
            {[
              { ok: Boolean(profile.fullName), label: "Thông tin cá nhân" },
              { ok: Boolean(profile.headline), label: "Vị trí mong muốn" },
              { ok: profile.skills.length > 0, label: "Kỹ năng" },
              { ok: Boolean(profile.cvFileName), label: "CV đính kèm" },
            ].map((item) => (
              <li
                key={item.label}
                className={`flex items-center gap-1.5 ${item.ok ? "text-success" : "text-ink-muted"}`}
              >
                <IconShieldCheck size={16} stroke={1.6} />
                {item.label}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Thông tin cá nhân */}
      <Card className="mt-6">
        <CardHeader className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-navy">
            <IconUser size={20} stroke={1.6} /> Thông tin cá nhân
          </h2>
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={startEdit}>
              <IconPencil size={16} stroke={1.6} /> Chỉnh sửa
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={cancel}>
                <IconX size={16} stroke={1.6} /> Hủy
              </Button>
              <Button variant="primary" size="sm" onClick={save}>
                <IconDeviceFloppy size={16} stroke={1.6} /> Lưu
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-5">
            <Avatar name={profile.fullName || user?.email || "U"} size="lg" />
            <div>
              <p className="font-semibold text-navy">{profile.fullName}</p>
              <p className="text-label text-ink-variant">{profile.email}</p>
            </div>
          </div>

          {!editing ? (
            <dl className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <dt className="text-label-sm text-ink-muted">Số điện thoại</dt>
                <dd className="mt-1 text-ink">{profile.phone}</dd>
              </div>
              <div>
                <dt className="text-label-sm text-ink-muted">Vị trí mong muốn</dt>
                <dd className="mt-1 text-ink">{profile.headline}</dd>
              </div>
              <div>
                <dt className="text-label-sm text-ink-muted">Số năm kinh nghiệm</dt>
                <dd className="mt-1 text-ink">{profile.experienceYears} năm</dd>
              </div>
            </dl>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field label="Họ và tên" htmlFor="pf-name">
                <Input
                  id="pf-name"
                  value={profile.fullName}
                  onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                />
              </Field>
              <Field label="Số điện thoại" htmlFor="pf-phone">
                <Input
                  id="pf-phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                />
              </Field>
              <Field label="Vị trí mong muốn" htmlFor="pf-headline">
                <Input
                  id="pf-headline"
                  value={profile.headline}
                  onChange={(e) => setProfile((p) => ({ ...p, headline: e.target.value }))}
                />
              </Field>
              <Field label="Số năm kinh nghiệm" htmlFor="pf-exp">
                <Input
                  id="pf-exp"
                  type="number"
                  min={0}
                  value={profile.experienceYears}
                  onChange={(e) => setProfile((p) => ({ ...p, experienceYears: e.target.value }))}
                />
              </Field>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Kỹ năng */}
      <Card className="mt-6">
        <CardHeader>
          <h2 className="flex items-center gap-2 font-semibold text-navy">
            <IconBriefcase size={20} stroke={1.6} /> Kỹ năng
          </h2>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="mb-4 flex gap-3">
              <Input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                placeholder="Thêm kỹ năng, ví dụ: Figma"
                className="flex-1"
              />
              <Button variant="secondary" onClick={addSkill}>Thêm</Button>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {profile.skills.length > 0 ? (
              profile.skills.map((skill) => (
                <Badge key={skill} variant="navy" shape="pill" className="gap-1.5 px-3 py-1.5">
                  {skill}
                  {editing && (
                    <button
                      type="button"
                      aria-label={`Xóa kỹ năng ${skill}`}
                      className="ml-1 text-navy/60 hover:text-danger"
                      onClick={() => removeSkill(skill)}
                    >
                      <IconX size={14} stroke={2} />
                    </button>
                  )}
                </Badge>
              ))
            ) : (
              <p className="text-ink-variant">Chưa có kỹ năng nào được thêm.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CV */}
      <Card className="mt-6">
        <CardHeader>
          <h2 className="flex items-center gap-2 font-semibold text-navy">
            <IconFileText size={20} stroke={1.6} /> CV của tôi
          </h2>
        </CardHeader>
        <CardContent>
          {profile.cvFileName ? (
            <div className="flex items-center justify-between rounded-default border border-border-subtle bg-surface-low px-5 py-4">
              <div className="flex items-center gap-3">
                <IconFileText size={24} stroke={1.6} className="text-navy" />
                <span className="font-semibold text-navy">{profile.cvFileName}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => showToast("Tính năng tải lên CV mới sẽ ra mắt sớm.", "info")}
              >
                <IconPencil size={16} stroke={1.6} /> Thay thế
              </Button>
            </div>
          ) : (
            <p className="text-ink-variant">
              Bạn chưa có CV. Hãy tải lên để tăng cơ hội được mời phỏng vấn.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
