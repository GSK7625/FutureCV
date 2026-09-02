/**
 * @file CvToolbar.tsx
 * @description Thanh công cụ nổi trên cùng của trang CV Builder (Đổi mẫu CV, Chọn bảng màu, Lưu nháp, Xuất file PDF, Reset).
 * @architecture Tuân thủ SRP: Chỉ đảm nhiệm các thao tác hành động mức trang (Toolbar Actions).
 */

import { Link } from "react-router";

import {
  IconArrowLeft,
  IconDownload,
  IconDeviceFloppy,
  IconCheck,
  IconRotate,
} from "@tabler/icons-react";
import type { CvTemplate } from "~/features/candidate/data/cvTemplates";

interface CvToolbarProps {
  selectedTemplate: CvTemplate;
  activeColor: string;
  isSaved: boolean;
  onColorChange: (color: string) => void;
  onResetData: () => void;
  onSaveCV: () => void;
  onExportPDF: () => void;
}

export function CvToolbar({
  selectedTemplate,
  activeColor,
  isSaved,
  onColorChange,
  onResetData,
  onSaveCV,
  onExportPDF,
}: CvToolbarProps) {
  return (
    <div className="sticky top-0 z-40 border-b border-border-subtle bg-white/95 px-4 py-3.5 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/cv/templates"
            className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-label-sm font-semibold text-navy transition-all hover:bg-surface-low"
          >
            <IconArrowLeft size={16} />
            <span>Đổi mẫu CV</span>
          </Link>
          <div className="hidden h-5 w-px bg-border-subtle sm:block" />
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-label-sm font-medium text-ink-muted">Mẫu đang chọn:</span>
            <span className="rounded-md bg-gold/15 px-2 py-0.5 text-label-sm font-bold text-gold">
              {selectedTemplate.name}
            </span>
          </div>
        </div>

        {/* Color Palettes & Actions */}
        <div className="flex items-center gap-3">
          {/* Color circles */}
          <div className="flex items-center gap-1.5 border-r border-border-subtle pr-3">
            <span className="hidden text-[12px] font-medium text-ink-muted lg:inline">
              Màu chủ đạo:
            </span>
            {selectedTemplate.colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onColorChange(c)}
                className={`h-6 w-6 rounded-full transition-all ${
                  activeColor === c
                    ? "scale-125 ring-2 ring-navy ring-offset-2"
                    : "opacity-75 hover:scale-110 hover:opacity-100"
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Màu ${c}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={onResetData}
            title="Đặt lại về nội dung mẫu gốc"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border-strong bg-white px-3 py-2 text-label-sm font-medium text-ink-muted transition-all hover:border-navy hover:text-navy"
          >
            <IconRotate size={16} />
            <span className="hidden sm:inline">Mẫu gốc</span>
          </button>

          <button
            type="button"
            onClick={onSaveCV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-navy bg-white px-4 py-2 text-label font-bold text-navy shadow-sm transition-all hover:bg-navy hover:text-white active:scale-95"
          >
            {isSaved ? <IconCheck size={18} className="text-emerald-600" /> : <IconDeviceFloppy size={18} />}
            <span>{isSaved ? "Đã lưu" : "Lưu CV"}</span>
          </button>

          <button
            type="button"
            onClick={onExportPDF}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gold px-5 py-2 text-label font-bold text-white shadow-sm transition-all hover:bg-[#b08233] active:scale-95"
          >
            <IconDownload size={18} />
            <span>Tải PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
