import { useEffect, useRef, useState } from "react";
import {
  IconAlertCircle,
  IconCheck,
  IconCopy,
  IconFileText,
  IconMail,
  IconRefresh,
  IconRoad,
  IconSparkles,
  IconTargetArrow,
  IconUser,
} from "@tabler/icons-react";
import { Badge, Button, Skeleton } from "~/components/ui";
import type { CareerMessage } from "../chat";
import { extractCoverLetter } from "../markdown";
import { MVP_SAMPLE_PROMPTS, type MvpSamplePrompt } from "../prompts";
import { MarkdownContent } from "./MarkdownContent";

interface ChatThreadProps {
  messages: CareerMessage[];
  activeId: string | null;
  detailLoading: boolean;
  chatPending: boolean;
  pendingQuestion: string | null;
  chatError: Error | null;
  failedQuestion: string | null;
  suggestedFollowups: string[];
  onPickPrompt: (prompt: string) => void;
  onRetryFailed: () => void;
  onCopySuccess: (label: string) => void;
}

const PROMPT_ICONS: Record<MvpSamplePrompt["id"], typeof IconSparkles> = {
  match: IconTargetArrow,
  skills: IconAlertCircle,
  summary: IconFileText,
  "cover-letter": IconMail,
  roadmap: IconRoad,
};

function CopyButton({
  text,
  label,
  toastLabel,
  variant = "ghost",
  onCopied,
}: {
  text: string;
  label: string;
  toastLabel: string;
  variant?: "ghost" | "secondary";
  onCopied: (msg: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopied(toastLabel);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable.
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      onClick={() => void handleCopy()}
      className="h-7 px-2.5 text-[12px]"
    >
      {copied ? <IconCheck size={13} className="text-success" /> : <IconCopy size={13} />}
      <span>{copied ? "Đã sao chép" : label}</span>
    </Button>
  );
}

export function ChatThread({
  messages,
  activeId,
  detailLoading,
  chatPending,
  pendingQuestion,
  chatError,
  failedQuestion,
  suggestedFollowups,
  onPickPrompt,
  onRetryFailed,
  onCopySuccess,
}: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const smooth =
      typeof window !== "undefined" &&
      !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, [messages.length, chatPending, activeId, chatError]);

  if (detailLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-5 space-y-4" aria-label="Đang tải nội dung cuộc trò chuyện">
        <Skeleton className="ml-auto h-16 w-2/3 rounded-lg" />
        <Skeleton className="h-28 w-4/5 rounded-lg" />
        <Skeleton className="ml-auto h-14 w-1/2 rounded-lg" />
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      role="log"
      aria-label="Nội dung cuộc trò chuyện"
      aria-live="polite"
      aria-busy={chatPending}
      className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"
    >
      {!messages.length && !chatPending && !failedQuestion ? (
        <div className="mx-auto max-w-3xl py-4 space-y-5">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-navy text-gold shadow-surface">
              <IconSparkles size={24} />
            </div>
            <h2 className="text-body-lg font-bold text-navy">
              Sẵn sàng tư vấn sự nghiệp &amp; hồ sơ ứng tuyển
            </h2>
            <p className="mx-auto max-w-xl text-label text-ink-variant">
              Chọn CV và việc làm ở phía trên, sau đó chọn nhanh một trong 5 nghiệp vụ gợi ý bên dưới hoặc đặt câu hỏi của riêng bạn.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {MVP_SAMPLE_PROMPTS.map((item) => {
              const Icon = PROMPT_ICONS[item.id];
              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-default border border-border-subtle bg-surface-low/50 p-3.5 transition-colors hover:border-gold/60 hover:bg-surface"
                >
                  <button
                    type="button"
                    onClick={() => onPickPrompt(item.prompt)}
                    className="text-left space-y-1.5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-tag bg-navy/8 text-navy">
                        <Icon size={14} />
                      </span>
                      <Badge variant="gold">{item.badge}</Badge>
                    </div>
                    <p className="text-label font-bold text-navy">{item.title}</p>
                    <p className="text-[12px] leading-relaxed text-ink-muted">{item.description}</p>
                  </button>

                  {item.alternatePrompt && (
                    <div className="mt-2.5 flex flex-wrap gap-2 border-t border-border-subtle pt-2">
                      <button
                        type="button"
                        onClick={() => onPickPrompt(item.prompt)}
                        className="text-[12px] font-semibold text-navy underline decoration-gold/70 hover:text-gold cursor-pointer"
                      >
                        Dùng bản tiếng Việt
                      </button>
                      <span className="text-border-strong">•</span>
                      <button
                        type="button"
                        onClick={() => onPickPrompt(item.alternatePrompt!.prompt)}
                        className="text-[12px] font-semibold text-navy underline decoration-gold/70 hover:text-gold cursor-pointer"
                      >
                        {item.alternatePrompt.label}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {messages.map((message, index) => {
        if (message.role === "user") {
          return (
            <article key={index} className="flex justify-end">
              <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-tag bg-navy px-4 py-3 text-white shadow-surface">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-gold/90">
                  <IconUser size={13} />
                  <span>Bạn</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-label leading-relaxed text-white">
                  {message.content}
                </p>
              </div>
            </article>
          );
        }

        const coverLetter = extractCoverLetter(message.content);
        const isLastAssistant = index === messages.length - 1;

        return (
          <article key={index} className="flex items-start gap-3">
            <div className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 text-gold sm:flex">
              <IconSparkles size={17} />
            </div>

            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="rounded-2xl rounded-tl-tag border border-border-subtle bg-surface p-4 shadow-surface">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-2">
                  <span className="inline-flex items-center gap-1.5 text-label-sm font-bold text-navy">
                    <IconSparkles size={14} className="text-gold sm:hidden" />
                    Trợ lý nghề nghiệp FutureCV
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {coverLetter && (
                      <CopyButton
                        text={coverLetter}
                        label="Sao chép Cover Letter"
                        toastLabel="Đã sao chép nội dung Cover Letter."
                        variant="secondary"
                        onCopied={onCopySuccess}
                      />
                    )}
                    <CopyButton
                      text={message.content}
                      label="Sao chép"
                      toastLabel="Đã sao chép câu trả lời."
                      onCopied={onCopySuccess}
                    />
                  </div>
                </div>

                <MarkdownContent content={message.content} />
              </div>

              {isLastAssistant && !chatPending && suggestedFollowups.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5" aria-label="Câu hỏi gợi ý tiếp theo">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    Gợi ý tiếp theo:
                  </span>
                  {suggestedFollowups.map((followup, fIdx) => (
                    <button
                      key={fIdx}
                      type="button"
                      onClick={() => onPickPrompt(followup)}
                      className="rounded-full border border-navy/15 bg-surface px-3 py-1.5 text-left text-[12px] font-medium text-navy transition-colors hover:border-gold hover:bg-gold/8 cursor-pointer"
                    >
                      {followup}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </article>
        );
      })}

      {chatPending && pendingQuestion && (
        <>
          <article className="flex justify-end">
            <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-tag bg-navy/90 px-4 py-3 text-white shadow-surface">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-gold/90">
                <IconUser size={13} />
                <span>Bạn • Đang gửi</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-label leading-relaxed text-white">
                {pendingQuestion}
              </p>
            </div>
          </article>

          <div role="status" className="flex items-start gap-3">
            <div className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 text-gold sm:flex">
              <IconSparkles size={17} className="animate-pulse" />
            </div>
            <div className="flex-1 rounded-2xl rounded-tl-tag border border-border-subtle bg-surface p-4 space-y-2.5 shadow-surface">
              <p className="text-label-sm font-semibold text-navy">
                Trợ lý AI đang phân tích ngữ cảnh và soạn phản hồi…
              </p>
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
        </>
      )}

      {chatError && failedQuestion && !chatPending && (
        <div
          role="alert"
          className="rounded-default border border-danger/30 bg-danger/5 p-4 space-y-3"
        >
          <div className="flex items-start gap-2.5">
            <IconAlertCircle size={18} className="mt-0.5 shrink-0 text-danger" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-label font-semibold text-danger">
                Không gửi được câu hỏi: {chatError.message}
              </p>
              <p className="rounded-tag bg-surface px-2.5 py-1.5 text-[12px] text-ink-variant line-clamp-3">
                “{failedQuestion}”
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={onRetryFailed}>
              <IconRefresh size={14} />
              Gửi lại câu hỏi
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
