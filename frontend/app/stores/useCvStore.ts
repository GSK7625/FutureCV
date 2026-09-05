import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CV_TEMPLATES } from "~/features/candidate/data/cvTemplates";

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface EducationItem {
  id: string;
  degree: string;
  school: string;
  startDate: string;
  endDate: string;
  gpa: string;
}

export interface PersonalInfo {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  avatar: string;
  summary: string;
}

export type CvPersonalInfo = PersonalInfo;
export type CvExperience = ExperienceItem;
export type CvEducation = EducationItem;


interface CvState {
  // Gallery & Filter State
  selectedCategory: string;
  selectedLanguage: string;
  templateColors: Record<string, string>;

  // Builder State
  templateId: string;
  activeColor: string;
  activeTab: "info" | "experience" | "education" | "skills";
  personalInfo: PersonalInfo;
  experiences: ExperienceItem[];
  educations: EducationItem[];
  skills: string[];

  // Actions
  setSelectedCategory: (category: string) => void;
  setSelectedLanguage: (language: string) => void;
  setTemplateColor: (templateId: string, color: string) => void;
  setActiveColor: (color: string) => void;
  setActiveTab: (tab: "info" | "experience" | "education" | "skills") => void;

  initFromTemplate: (templateId: string, customColor?: string) => void;
  updatePersonalInfo: (data: Partial<PersonalInfo>) => void;

  addExperience: () => void;
  updateExperience: (id: string, data: Partial<ExperienceItem>) => void;
  removeExperience: (id: string) => void;

  addEducation: () => void;
  updateEducation: (id: string, data: Partial<EducationItem>) => void;
  removeEducation: (id: string) => void;

  addSkill: (skill: string) => void;
  removeSkill: (index: number) => void;
  resetToTemplate: (templateId: string) => void;
}

const DEFAULT_TEMPLATE = CV_TEMPLATES[0];

export const useCvStore = create<CvState>()(
  persist(
    (set, get) => ({
      selectedCategory: "all",
      selectedLanguage: "Tiếng Việt",
      templateColors: {},

      templateId: DEFAULT_TEMPLATE.id,
      activeColor: DEFAULT_TEMPLATE.defaultColor,
      activeTab: "info",

      personalInfo: {
        fullName: DEFAULT_TEMPLATE.sampleCandidate.fullName,
        title: DEFAULT_TEMPLATE.sampleCandidate.title,
        email: "ungvien@futurecv.vn",
        phone: "0988 123 456",
        location: "Hà Nội, Việt Nam",
        website: "linkedin.com/in/futurecv-profile",
        avatar: DEFAULT_TEMPLATE.sampleCandidate.avatar,
        summary: DEFAULT_TEMPLATE.sampleCandidate.summary,
      },

      experiences: [
        {
          id: "exp-1",
          role: "Senior Business Specialist",
          company: "Tập đoàn Công nghệ FPT",
          startDate: "03/2023",
          endDate: "Hiện tại",
          description:
            "• Xây dựng và mở rộng hệ thống khách hàng doanh nghiệp B2B với mức tăng trưởng 135% KPI năm 2024.\n• Quản lý đội ngũ 6 chuyên viên và tối ưu hóa quy trình tư vấn giải pháp chuyển đổi số.",
        },
        {
          id: "exp-2",
          role: "Business Development Officer",
          company: "VNG Corporation",
          startDate: "06/2021",
          endDate: "02/2023",
          description:
            "• Phối hợp với team Product để phát triển các tính năng thanh toán & dịch vụ số.\n• Ký kết thành công hơn 40 hợp đồng đối tác chiến lược trong ngành E-Commerce.",
        },
      ],

      educations: [
        {
          id: "edu-1",
          degree: "Cử nhân Kinh tế Quốc tế",
          school: "Đại học Ngoại Thương Hà Nội",
          startDate: "2018",
          endDate: "2022",
          gpa: "GPA 3.65/4.0 - Tốt nghiệp loại Giỏi",
        },
      ],

      skills: [
        "Kỹ năng đàm phán B2B",
        "Phân tích dữ liệu & Báo cáo",
        "Tiếng Anh C1 (IELTS 7.5)",
        "Quản trị dự án Agile / Scrum",
        "CRM & Automation Tools",
      ],

      setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
      setSelectedLanguage: (selectedLanguage) => set({ selectedLanguage }),
      setTemplateColor: (templateId, color) =>
        set((state) => ({
          templateColors: { ...state.templateColors, [templateId]: color },
        })),

      setActiveColor: (activeColor) => set({ activeColor }),
      setActiveTab: (activeTab) => set({ activeTab }),

      initFromTemplate: (templateId, customColor) => {
        const template = CV_TEMPLATES.find((t) => t.id === templateId) ?? CV_TEMPLATES[0];
        const color = customColor || get().templateColors[templateId] || template.defaultColor;

        set((state) => ({
          templateId,
          activeColor: color,
          personalInfo: {
            ...state.personalInfo,
            fullName: state.personalInfo.fullName || template.sampleCandidate.fullName,
            title: state.personalInfo.title || template.sampleCandidate.title,
            avatar: state.personalInfo.avatar || template.sampleCandidate.avatar,
            summary: state.personalInfo.summary || template.sampleCandidate.summary,
          },
        }));
      },

      updatePersonalInfo: (data) =>
        set((state) => ({
          personalInfo: { ...state.personalInfo, ...data },
        })),

      addExperience: () =>
        set((state) => ({
          experiences: [
            ...state.experiences,
            {
              id: `exp-${Date.now()}`,
              role: "Vị trí mới",
              company: "Tên công ty",
              startDate: "01/2024",
              endDate: "Hiện tại",
              description: "• Mô tả thành tích và nhiệm vụ chính tại đây...",
            },
          ],
        })),

      updateExperience: (id, data) =>
        set((state) => ({
          experiences: state.experiences.map((item) =>
            item.id === id ? { ...item, ...data } : item,
          ),
        })),

      removeExperience: (id) =>
        set((state) => ({
          experiences: state.experiences.filter((item) => item.id !== id),
        })),

      addEducation: () =>
        set((state) => ({
          educations: [
            ...state.educations,
            {
              id: `edu-${Date.now()}`,
              degree: "Bằng cấp / Chuyên ngành",
              school: "Tên trường Đại học",
              startDate: "2020",
              endDate: "2024",
              gpa: "GPA: 3.5/4.0",
            },
          ],
        })),

      updateEducation: (id, data) =>
        set((state) => ({
          educations: state.educations.map((item) =>
            item.id === id ? { ...item, ...data } : item,
          ),
        })),

      removeEducation: (id) =>
        set((state) => ({
          educations: state.educations.filter((item) => item.id !== id),
        })),

      addSkill: (skill) => {
        const trimmed = skill.trim();
        if (!trimmed) return;
        set((state) => {
          if (state.skills.includes(trimmed)) return state;
          return { skills: [...state.skills, trimmed] };
        });
      },

      removeSkill: (index) =>
        set((state) => ({
          skills: state.skills.filter((_, i) => i !== index),
        })),

      resetToTemplate: (templateId) => {
        const template = CV_TEMPLATES.find((t) => t.id === templateId) ?? CV_TEMPLATES[0];
        set({
          templateId,
          activeColor: template.defaultColor,
          personalInfo: {
            fullName: template.sampleCandidate.fullName,
            title: template.sampleCandidate.title,
            email: "ungvien@futurecv.vn",
            phone: "0988 123 456",
            location: "Hà Nội, Việt Nam",
            website: "linkedin.com/in/futurecv-profile",
            avatar: template.sampleCandidate.avatar,
            summary: template.sampleCandidate.summary,
          },
          skills: template.sampleCandidate.skills,
        });
      },
    }),
    {
      name: "futurecv-draft-cv",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
