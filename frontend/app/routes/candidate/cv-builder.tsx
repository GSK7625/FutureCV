/**
 * @file cv-builder.tsx
 * @description Trang biên tập CV trực tuyến (CV Builder) chính của ứng viên.
 * @architecture Tối ưu hóa subscriptions bằng useShallow và ổn định callback references.
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router";
import { useShallow } from "zustand/react/shallow";
import { CV_TEMPLATES } from "~/features/candidate/data/cvTemplates";
import { useCvStore, type CvPersonalInfo } from "~/stores/useCvStore";
import { useUIStore } from "~/stores/useUIStore";
import { CvToolbar } from "~/features/candidate/components/cv-builder/CvToolbar";
import { CvEditorTabs } from "~/features/candidate/components/cv-builder/CvEditorTabs";
import { PersonalInfoForm } from "~/features/candidate/components/cv-builder/PersonalInfoForm";
import { ExperienceForm } from "~/features/candidate/components/cv-builder/ExperienceForm";
import { EducationForm } from "~/features/candidate/components/cv-builder/EducationForm";
import { SkillsForm } from "~/features/candidate/components/cv-builder/SkillsForm";
import { CvPreviewPaper } from "~/features/candidate/components/cv-builder/CvPreviewPaper";

export default function CvBuilderPage() {
  const { templateId = "standard-general" } = useParams();
  const [searchParams] = useSearchParams();
  const showToast = useUIStore((s) => s.showToast);

  // ── Zustand Global CV Store Slices (Gom bằng useShallow) ───
  const cv = useCvStore(
    useShallow((s) => ({
      templateId: s.templateId,
      activeColor: s.activeColor,
      activeTab: s.activeTab,
      personalInfo: s.personalInfo,
      experiences: s.experiences,
      educations: s.educations,
      skills: s.skills,
    })),
  );

  const actions = useCvStore(
    useShallow((s) => ({
      setActiveColor: s.setActiveColor,
      setActiveTab: s.setActiveTab,
      initFromTemplate: s.initFromTemplate,
      updatePersonalInfo: s.updatePersonalInfo,
      addExperience: s.addExperience,
      updateExperience: s.updateExperience,
      removeExperience: s.removeExperience,
      addEducation: s.addEducation,
      updateEducation: s.updateEducation,
      removeEducation: s.removeEducation,
      addSkill: s.addSkill,
      removeSkill: s.removeSkill,
      resetToTemplate: s.resetToTemplate,
    })),
  );

  // ── Local Transient UI State ───────────────────────────────
  const [isSaved, setIsSaved] = useState(false);

  const selectedTemplate = useMemo(() => {
    return CV_TEMPLATES.find((t) => t.id === templateId) ?? CV_TEMPLATES[0];
  }, [templateId]);

  useEffect(() => {
    if (templateId && templateId !== cv.templateId) {
      const colorParam = searchParams.get("color");
      actions.initFromTemplate(templateId, colorParam || undefined);
    }
  }, [templateId, cv.templateId, searchParams, actions]);

  const handleUpdatePersonalInfo = useCallback(
    (data: Partial<CvPersonalInfo>) => {
      actions.updatePersonalInfo(data);
    },
    [actions],
  );

  const handleSaveCV = useCallback(() => {
    setIsSaved(true);
    showToast("Đã lưu bản nháp CV thành công vào hệ thống!", "success");
    setTimeout(() => setIsSaved(false), 3000);
  }, [showToast]);

  const handleExportPDF = useCallback(() => {
    showToast("Đang chuẩn bị file PDF chất lượng cao...", "info");
    window.print();
  }, [showToast]);

  const handleResetData = useCallback(() => {
    if (confirm("Bạn có chắc muốn đặt lại toàn bộ nội dung theo mẫu gốc này không?")) {
      actions.resetToTemplate(selectedTemplate.id);
      showToast("Đã khôi phục nội dung mẫu ban đầu.", "info");
    }
  }, [actions, selectedTemplate.id, showToast]);

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-24">
      {/* ── Top Floating Action Bar ─────────────────────────── */}
      <CvToolbar
        selectedTemplate={selectedTemplate}
        activeColor={cv.activeColor}
        isSaved={isSaved}
        onColorChange={actions.setActiveColor}
        onResetData={handleResetData}
        onSaveCV={handleSaveCV}
        onExportPDF={handleExportPDF}
      />

      {/* ── Main Workspace: Editor Form (Left) & Realtime Preview (Right) ── */}
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* ── Left Column: Form Editor (5 cols) ─────────────── */}
          <div className="flex flex-col gap-6 lg:col-span-5">
            <CvEditorTabs activeTab={cv.activeTab} onTabChange={actions.setActiveTab} />

            {cv.activeTab === "info" && (
              <PersonalInfoForm
                personalInfo={cv.personalInfo}
                onUpdate={handleUpdatePersonalInfo}
              />
            )}

            {cv.activeTab === "experience" && (
              <ExperienceForm
                experiences={cv.experiences}
                onAdd={actions.addExperience}
                onUpdate={actions.updateExperience}
                onRemove={actions.removeExperience}
              />
            )}

            {cv.activeTab === "education" && (
              <EducationForm
                educations={cv.educations}
                onAdd={actions.addEducation}
                onUpdate={actions.updateEducation}
                onRemove={actions.removeEducation}
              />
            )}

            {cv.activeTab === "skills" && (
              <SkillsForm
                skills={cv.skills}
                onAddSkill={actions.addSkill}
                onRemoveSkill={actions.removeSkill}
              />
            )}
          </div>

          {/* ── Right Column: Live A4-Styled CV Preview (7 cols) ──── */}
          <CvPreviewPaper
            activeColor={cv.activeColor}
            personalInfo={cv.personalInfo}
            experiences={cv.experiences}
            educations={cv.educations}
            skills={cv.skills}
          />
        </div>
      </div>
    </div>
  );
}
