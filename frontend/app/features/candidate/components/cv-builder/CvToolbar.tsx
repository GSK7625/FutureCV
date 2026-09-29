/**
 * @file CvToolbar.tsx
 * @description Thanh công cụ nổi trên cùng của trang CV Builder.
 * FC-82: Bổ sung nút "Lưu vào Kho CV" — 1-click PDF blob upload lên backend.
 * @architecture SRP: Chỉ đảm nhiệm các thao tác hành động mức trang (Toolbar Actions).
 */

import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router";

import {
  IconArrowLeft,
  IconDownload,
  IconDeviceFloppy,
  IconCheck,
  IconRotate,
  IconCloudUpload,
} from "@tabler/icons-react";
import type { CvTemplate } from "~/features/candidate/data/cvTemplates";
import { useUploadCandidateCv } from "~/features/candidate/hooks/useCandidateCvs";
import { useUIStore } from "~/stores/useUIStore";

interface CvToolbarProps {
  selectedTemplate: CvTemplate;
  activeColor: string;
  isSaved: boolean;
  personalInfoFullName?: string;
  onColorChange: (color: string) => void;
  onResetData: () => void;
  onSaveCV: () => void;
  onExportPDF: () => void;
}

// ── 1-Click Save to Kho CV ────────────────────────────────────────────────────

const SAVE_TO_VAULT_STATES = {
  idle: "Lưu vào Kho CV",
  generating: "Đang kết xuất PDF...",
  uploading: "Đang tải lên...",
  done: "Đã lưu vào Kho CV",
} as const;

function useSaveToVault(fullName?: string) {
  const [state, setState] = useState<keyof typeof SAVE_TO_VAULT_STATES>("idle");
  const uploadMutation = useUploadCandidateCv();
  const showToast = useUIStore((s) => s.showToast);
  const navigate = useNavigate();

  const saveToVault = useCallback(async () => {
    if (state !== "idle") return;

    // Step 1: Locate the CV preview element
    const element = document.getElementById("cv-preview-paper");
    if (!element) {
      showToast("Không tìm thấy bản xem trước CV. Vui lòng thử lại.", "error");
      return;
    }

    try {
      setState("generating");

      // Step 2: Dynamic import html2pdf.js (lazy load only when needed)
      // If html2pdf not installed, fallback: open print dialog then redirect
      let pdfBlob: Blob;
      try {
        // @ts-ignore — html2pdf.js has no @types package; install: npm i html2pdf.js
        const html2pdf = (await import("html2pdf.js")).default;
        const safeName = (fullName || "UngVien").replace(/\s+/g, "_");
        const filename = `${safeName}_CV.pdf`;
        pdfBlob = await html2pdf()
          .set({
            margin: 0,
            filename,
            image: { type: "jpeg", quality: 0.96 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          })
          .from(element)
          .outputPdf("blob");
      } catch {
        // Fallback: print dialog + navigate
        showToast(
          "Hãy dùng chức năng In PDF của trình duyệt, rồi tải lên tại trang Quản lý CV.",
          "info"
        );
        window.print();
        setState("idle");
        return;
      }

      // Step 3: Upload blob as File
      setState("uploading");
      const safeName = (fullName || "UngVien").replace(/\s+/g, "_");
      const today = new Date().toLocaleDateString("vi-VN").replace(/\//g, "-");
      const title = `CV từ Builder - ${today}`;
      const pdfFile = new File([pdfBlob], `${safeName}_CV.pdf`, {
        type: "application/pdf",
      });

      await uploadMutation.mutateAsync({ file: pdfFile, title });
      setState("done");

      // Step 4: Prompt navigation
      showToast(
        "Đã lưu vào Kho CV. Chuyển sang trang Quản lý CV để xem.",
        "success"
      );
      setTimeout(() => {
        setState("idle");
        navigate("/candidate/cvs");
      }, 2000);
    } catch {
      showToast("Lưu vào Kho CV thất bại. Vui lòng thử lại.", "error");
      setState("idle");
    }
  }, [state, fullName, uploadMutation, showToast, navigate]);

  return { saveToVault, state };
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

export function CvToolbar({
  selectedTemplate,
  activeColor,
  isSaved,
  personalInfoFullName,
  onColorChange,
  onResetData,
  onSaveCV,
  onExportPDF,
}: CvToolbarProps) {
  const { saveToVault, state: vaultState } = useSaveToVault(personalInfoFullName);
  const isVaultBusy = vaultState !== "idle";

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
        <div className="flex items-center gap-2 sm:gap-3">
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
            <span>{isSaved ? "Đã lưu" : "Lưu nháp"}</span>
          </button>

          {/* FC-82: 1-Click Save to Kho CV */}
          <button
            type="button"
            onClick={saveToVault}
            disabled={isVaultBusy}
            title="Kết xuất PDF và lưu thẳng vào Kho CV của tôi"
            className="inline-flex items-center gap-1.5 rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-label-sm font-bold text-success shadow-sm transition-all hover:bg-success/20 active:scale-95 disabled:cursor-wait disabled:opacity-70"
          >
            <IconCloudUpload size={16} className={isVaultBusy ? "animate-pulse" : ""} />
            <span className="hidden md:inline">{SAVE_TO_VAULT_STATES[vaultState]}</span>
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
