/**
 * @file CvPreviewPaper.tsx
 * @description Bản xem trước CV thời gian thực mô phỏng chuẩn trang in A4 (Render động theo thông tin cá nhân, màu chủ đạo, kinh nghiệm, học vấn, kỹ năng).
 * @architecture Tuân thủ SRP (Chỉ đảm nhiệm render bản xem trước CV A4) & ISP (Nhận data props thuần túy không phụ thuộc store).
 */

import { IconEye } from "@tabler/icons-react";

import type {
  CvPersonalInfo,
  CvExperience,
  CvEducation,
} from "~/stores/useCvStore";

interface CvPreviewPaperProps {
  activeColor: string;
  personalInfo: CvPersonalInfo;
  experiences: CvExperience[];
  educations: CvEducation[];
  skills: string[];
}

export function CvPreviewPaper({
  activeColor,
  personalInfo,
  experiences,
  educations,
  skills,
}: CvPreviewPaperProps) {
  return (
    <div className="flex flex-col items-center lg:col-span-7">
      <div className="mb-3 flex w-full items-center justify-between px-2 text-label-sm text-ink-muted">
        <span className="flex items-center gap-1.5 font-semibold text-navy">
          <IconEye size={16} /> Xem trước thời gian thực (Trang A4)
        </span>
        <span>Tỉ lệ chuẩn in ấn PDF</span>
      </div>

      {/* ── The Rendered A4 Sheet ───────────────────────── */}
      <div
        className="w-full max-w-[680px] rounded-xl border border-border-subtle bg-white p-8 shadow-2xl transition-all duration-300 md:p-12"
        style={{ borderTop: `8px solid ${activeColor}` }}
      >
        {/* Header Section */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-border-subtle pb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-black tracking-tight" style={{ color: activeColor }}>
              {personalInfo.fullName || "HỌ VÀ TÊN"}
            </h1>
            <h2 className="mt-1 text-label-lg font-bold text-ink-muted">
              {personalInfo.title || "VỊ TRÍ ỨNG TUYỂN"}
            </h2>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-label-sm text-ink-variant">
              {personalInfo.email && <span>✉️ {personalInfo.email}</span>}
              {personalInfo.phone && <span>📞 {personalInfo.phone}</span>}
              {personalInfo.location && <span>📍 {personalInfo.location}</span>}
              {personalInfo.website && <span>🌐 {personalInfo.website}</span>}
            </div>
          </div>

          {personalInfo.avatar && (
            <div className="shrink-0">
              <img
                src={personalInfo.avatar}
                alt={personalInfo.fullName}
                className="h-24 w-24 rounded-full object-cover shadow-md ring-4 ring-slate-100"
              />
            </div>
          )}
        </div>

        {/* 1. Summary / Objective */}
        {personalInfo.summary && (
          <div className="my-6">
            <h3
              className="mb-2 text-label font-bold uppercase tracking-wider"
              style={{ color: activeColor }}
            >
              Mục tiêu nghề nghiệp
            </h3>
            <p className="whitespace-pre-line text-body-sm leading-relaxed text-ink-variant">
              {personalInfo.summary}
            </p>
          </div>
        )}

        {/* 2. Work Experience */}
        {experiences.length > 0 && (
          <div className="my-6">
            <h3
              className="mb-3 text-label font-bold uppercase tracking-wider"
              style={{ color: activeColor }}
            >
              Kinh nghiệm làm việc
            </h3>
            <div className="flex flex-col gap-4">
              {experiences.map((exp) => (
                <div
                  key={exp.id}
                  className="relative pl-3 border-l-2"
                  style={{ borderColor: activeColor }}
                >
                  <div className="flex flex-wrap items-center justify-between text-body-sm">
                    <strong className="text-navy">{exp.role}</strong>
                    <span className="text-[12px] font-semibold text-ink-muted">
                      {exp.startDate} - {exp.endDate}
                    </span>
                  </div>
                  <div className="text-[13px] font-medium text-gold">{exp.company}</div>
                  <p className="mt-1.5 whitespace-pre-line text-[12.5px] leading-relaxed text-ink-variant">
                    {exp.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Education */}
        {educations.length > 0 && (
          <div className="my-6">
            <h3
              className="mb-3 text-label font-bold uppercase tracking-wider"
              style={{ color: activeColor }}
            >
              Học vấn & Trình độ
            </h3>
            <div className="flex flex-col gap-3">
              {educations.map((edu) => (
                <div
                  key={edu.id}
                  className="flex flex-wrap items-start justify-between text-body-sm"
                >
                  <div>
                    <strong className="text-navy">{edu.degree}</strong>
                    <div className="text-[13px] text-ink-variant">{edu.school}</div>
                    {edu.gpa && <div className="text-[12px] text-ink-muted">{edu.gpa}</div>}
                  </div>
                  <span className="text-[12px] font-semibold text-ink-muted">
                    {edu.startDate} - {edu.endDate}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Skills */}
        {skills.length > 0 && (
          <div className="my-6">
            <h3
              className="mb-3 text-label font-bold uppercase tracking-wider"
              style={{ color: activeColor }}
            >
              Kỹ năng chuyên môn
            </h3>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, i) => (
                <span
                  key={i}
                  className="rounded-lg bg-slate-100 px-3 py-1 text-label-sm font-semibold text-navy"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
