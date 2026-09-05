/**
 * @file cv-builder.tsx
 * @description Trang biên tập CV trực tuyến (CV Builder) chính của ứng viên.
 * @architecture Tuân thủ SRP (Orchestrator Pattern): Đóng vai trò trang điều phối kết nối Zustand CV Store với các subcomponents (Toolbar, EditorTabs, Forms, PreviewPaper).
 */

import { useState, useMemo, useEffect } from "react";

import { useParams, useSearchParams } from "react-router";
import { CV_TEMPLATES } from "~/features/candidate/data/cvTemplates";
import { useCvStore } from "~/stores/useCvStore";
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

  // ── Zustand Global CV Store ────────────────────────────────
  const templateIdStore = useCvStore((s) => s.templateId);
  const activeColor = useCvStore((s) => s.activeColor);
  const activeTab = useCvStore((s) => s.activeTab);
  const personalInfo = useCvStore((s) => s.personalInfo);
  const experiences = useCvStore((s) => s.experiences);
  const educations = useCvStore((s) => s.educations);
  const skills = useCvStore((s) => s.skills);

  const setActiveColor = useCvStore((s) => s.setActiveColor);
  const setActiveTab = useCvStore((s) => s.setActiveTab);
  const initFromTemplate = useCvStore((s) => s.initFromTemplate);
  const updatePersonalInfo = useCvStore((s) => s.updatePersonalInfo);
  const addExperience = useCvStore((s) => s.addExperience);
  const updateExperience = useCvStore((s) => s.updateExperience);
  const removeExperience = useCvStore((s) => s.removeExperience);
  const addEducation = useCvStore((s) => s.addEducation);
  const updateEducation = useCvStore((s) => s.updateEducation);
  const removeEducation = useCvStore((s) => s.removeEducation);
  const addSkill = useCvStore((s) => s.addSkill);
  const removeSkill = useCvStore((s) => s.removeSkill);
  const resetToTemplate = useCvStore((s) => s.resetToTemplate);

  // ── Local Transient UI State ───────────────────────────────
  const [isSaved, setIsSaved] = useState(false);

  const selectedTemplate = useMemo(() => {
    return CV_TEMPLATES.find((t) => t.id === templateId) ?? CV_TEMPLATES[0];
  }, [templateId]);

  useEffect(() => {
    if (templateId && templateId !== templateIdStore) {
      const colorParam = searchParams.get("color");
      initFromTemplate(templateId, colorParam || undefined);
    }
  }, [templateId, templateIdStore, searchParams, initFromTemplate]);

  const handleSaveCV = () => {
    setIsSaved(true);
    showToast("Đã lưu bản nháp CV thành công vào hệ thống!", "success");
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleExportPDF = () => {
    showToast("Đang chuẩn bị file PDF chất lượng cao...", "info");
    window.print();
  };

  const handleResetData = () => {
    if (confirm("Bạn có chắc muốn đặt lại toàn bộ nội dung theo mẫu gốc này không?")) {
      resetToTemplate(selectedTemplate.id);
      showToast("Đã khôi phục nội dung mẫu ban đầu.", "info");
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-24">
      {/* ── Top Floating Action Bar ─────────────────────────── */}
      <CvToolbar
        selectedTemplate={selectedTemplate}
        activeColor={activeColor}
        isSaved={isSaved}
        onColorChange={setActiveColor}
        onResetData={handleResetData}
        onSaveCV={handleSaveCV}
        onExportPDF={handleExportPDF}
      />

      {/* ── Main Workspace: Editor Form (Left) & Realtime Preview (Right) ── */}
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* ── Left Column: Form Editor (5 cols) ─────────────── */}
          <div className="flex flex-col gap-6 lg:col-span-5">
            <CvEditorTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === "info" && (
              <PersonalInfoForm
                personalInfo={personalInfo}
                onUpdate={updatePersonalInfo}
              />
            )}

            {activeTab === "experience" && (
              <ExperienceForm
                experiences={experiences}
                onAdd={addExperience}
                onUpdate={updateExperience}
                onRemove={removeExperience}
              />
            )}

            {activeTab === "education" && (
              <EducationForm
                educations={educations}
                onAdd={addEducation}
                onUpdate={updateEducation}
                onRemove={removeEducation}
              />
            )}

            {activeTab === "skills" && (
              <SkillsForm
                skills={skills}
                onAddSkill={addSkill}
                onRemoveSkill={removeSkill}
              />
            )}
          </div>

          {/* ── Right Column: Live A4-Styled CV Preview (7 cols) ──── */}
          <CvPreviewPaper
            activeColor={activeColor}
            personalInfo={personalInfo}
            experiences={experiences}
            educations={educations}
            skills={skills}
          />
        </div>
      </div>
    </div>
  );
}
