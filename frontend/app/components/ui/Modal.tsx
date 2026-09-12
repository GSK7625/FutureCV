import { useEffect, type ReactNode } from "react";
import { IconX as X } from "@tabler/icons-react";
import { cn } from "~/lib/cn";
import { Button } from "./Button";

export interface ModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({ open, isOpen, onClose, title, children, footer, className }: ModalProps) {
  const isModalOpen = open ?? isOpen ?? false;
  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isModalOpen, onClose]);

  if (!isModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-overlay flex items-center justify-center bg-navy/40 p-4 backdrop-blur-[12px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "z-modal w-full max-w-lg rounded-lg border border-border-subtle bg-surface shadow-overlay",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <h2 className="text-headline-md text-navy">{title}</h2>
          <Button variant="ghost" size="icon" aria-label="Đóng" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-border-subtle px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
