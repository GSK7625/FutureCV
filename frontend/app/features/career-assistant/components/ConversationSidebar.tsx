import { useState, type FormEvent } from "react";
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconHistory,
  IconMessage,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Badge, Button, Skeleton } from "~/components/ui";
import type { CareerConversationSummary, PagedCareerConversations } from "../chat";
import type { SavedConversation } from "../history";

interface ConversationSidebarProps {
  conversationsData?: PagedCareerConversations;
  isLoading: boolean;
  error?: Error | null;
  activeId: string | null;
  busy: boolean;
  creating: boolean;
  renamingPending: boolean;
  pageIndex: number;
  localLegacyCount: number;
  showLegacyBanner: boolean;
  importingLegacy: boolean;
  onPageChange: (page: number) => void;
  onRetryList: () => void;
  onCreateNew: () => void;
  onOpenConversation: (conversationId: string) => void;
  onRenameConversation: (id: string, title: string) => Promise<void> | void;
  onRequestDelete: (conversation: CareerConversationSummary) => void;
  onRequestImportLegacy: () => void;
  onDismissLegacyBanner: () => void;
  onCloseMobileDrawer?: () => void;
}

export function ConversationSidebar({
  conversationsData,
  isLoading,
  error,
  activeId,
  busy,
  creating,
  renamingPending,
  pageIndex,
  localLegacyCount,
  showLegacyBanner,
  importingLegacy,
  onPageChange,
  onRetryList,
  onCreateNew,
  onOpenConversation,
  onRenameConversation,
  onRequestDelete,
  onRequestImportLegacy,
  onDismissLegacyBanner,
  onCloseMobileDrawer,
}: ConversationSidebarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");

  const startRename = (conversation: CareerConversationSummary) => {
    setRenamingId(conversation.id);
    setRenameTitle(conversation.title);
  };

  const cancelRename = () => {
    setRenamingId(null);
    setRenameTitle("");
  };

  const submitRename = async (event: FormEvent, id: string) => {
    event.preventDefault();
    const trimmed = renameTitle.trim();
    if (!trimmed) return;
    await onRenameConversation(id, trimmed);
    setRenamingId(null);
    setRenameTitle("");
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="border-b border-border-subtle p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <IconHistory size={18} className="shrink-0 text-gold" />
            <h2 id="career-history-title" className="truncate text-body font-bold text-navy">
              Lịch sử hội thoại
            </h2>
            {conversationsData && (
              <Badge variant="neutral" shape="pill">
                {conversationsData.totalCount}
              </Badge>
            )}
          </div>
          {onCloseMobileDrawer && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 lg:hidden"
              onClick={onCloseMobileDrawer}
              aria-label="Đóng danh sách hội thoại"
            >
              <IconX size={18} />
            </Button>
          )}
        </div>

        <Button
          size="sm"
          variant="primary"
          className="w-full justify-center"
          disabled={busy || creating}
          onClick={onCreateNew}
        >
          <IconPlus size={16} />
          <span>{creating ? "Đang tạo…" : "Cuộc trò chuyện mới"}</span>
        </Button>
      </div>

      {localLegacyCount > 0 && showLegacyBanner && (
        <div
          role="region"
          aria-label="Lịch sử cũ trên trình duyệt"
          className="m-3 rounded-default border border-gold/40 bg-gold/8 p-3 space-y-2"
        >
          <p className="text-label-sm font-bold text-navy">
            Có {localLegacyCount} hội thoại lưu trên trình duyệt này
          </p>
          <p className="text-[12px] leading-relaxed text-ink-variant">
            Hệ thống chỉ đồng bộ lên tài khoản khi bạn xác nhận đồng ý.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" className="h-8 px-3 text-[12px]" disabled={importingLegacy} onClick={onRequestImportLegacy}>
              {importingLegacy ? "Đang chuyển…" : "Chuyển lên tài khoản"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-[12px]"
              disabled={importingLegacy}
              onClick={onDismissLegacyBanner}
            >
              Để sau
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="space-y-2" aria-label="Đang tải danh sách cuộc trò chuyện">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="rounded-default border border-border-subtle p-3 space-y-2">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="rounded-default border border-danger/20 bg-danger/5 p-3 text-center space-y-2">
            <p className="text-label-sm text-danger">{error.message}</p>
            <Button size="sm" variant="secondary" className="h-8 px-3" onClick={onRetryList}>
              <IconRefresh size={14} />
              Thử lại
            </Button>
          </div>
        ) : !conversationsData?.items.length ? (
          <div className="rounded-default border border-dashed border-border-strong px-4 py-8 text-center space-y-2">
            <IconMessage size={26} className="mx-auto text-ink-muted" />
            <p className="text-label font-semibold text-navy">Chưa có hội thoại nào</p>
            <p className="text-[12px] leading-relaxed text-ink-muted">
              Đặt câu hỏi đầu tiên hoặc bấm “Cuộc trò chuyện mới” để bắt đầu lưu lịch sử theo tài khoản.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5" aria-label="Danh sách cuộc trò chuyện đã lưu">
            {conversationsData.items.map((conversation) => {
              const isActive = activeId === conversation.id;
              const isRenaming = renamingId === conversation.id;

              return (
                <li
                  key={conversation.id}
                  className={`group rounded-default border transition-all ${
                    isActive
                      ? "border-gold bg-gold/6 shadow-2xs"
                      : "border-border-subtle bg-surface hover:border-navy/25 hover:bg-surface-low/60"
                  }`}
                >
                  {isRenaming ? (
                    <form
                      className="flex items-center gap-1.5 p-2"
                      onSubmit={(e) => void submitRename(e, conversation.id)}
                    >
                      <input
                        type="text"
                        maxLength={120}
                        autoFocus
                        value={renameTitle}
                        onChange={(e) => setRenameTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") cancelRename();
                        }}
                        aria-label="Tiêu đề cuộc trò chuyện mới"
                        className="min-w-0 flex-1 rounded-tag border border-border-strong bg-white px-2.5 py-1.5 text-label-sm text-ink focus:border-gold"
                      />
                      <button
                        type="submit"
                        disabled={!renameTitle.trim() || renamingPending}
                        aria-label="Lưu tên mới"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-tag bg-navy text-white hover:bg-navy-secondary disabled:opacity-50"
                      >
                        <IconCheck size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={cancelRename}
                        aria-label="Hủy đổi tên"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-tag text-ink-muted hover:bg-surface-high"
                      >
                        <IconX size={14} />
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-start gap-1 p-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onOpenConversation(conversation.id)}
                        aria-current={isActive ? "true" : undefined}
                        className="min-w-0 flex-1 rounded-tag p-1.5 text-left focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-60 cursor-pointer"
                      >
                        <p className={`line-clamp-2 text-label font-semibold ${isActive ? "text-navy" : "text-ink"}`}>
                          {conversation.title}
                        </p>
                        {(conversation.cvTitle || conversation.jobTitle) && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {conversation.cvTitle && (
                              <span className="max-w-full truncate rounded-tag bg-navy/6 px-1.5 py-0.5 text-[11px] font-medium text-navy">
                                CV: {conversation.cvTitle}
                              </span>
                            )}
                            {conversation.jobTitle && (
                              <span className="max-w-full truncate rounded-tag bg-gold/15 px-1.5 py-0.5 text-[11px] font-medium text-navy">
                                Job: {conversation.jobTitle}
                              </span>
                            )}
                          </div>
                        )}
                        <p className="mt-1.5 text-[11px] text-ink-muted">
                          {new Date(conversation.updatedAt).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          • {conversation.messageCount} tin nhắn
                        </p>
                      </button>

                      <div className="flex shrink-0 flex-col gap-0.5 pt-1 opacity-100 lg:opacity-70 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => startRename(conversation)}
                          aria-label={`Đổi tên cuộc trò chuyện ${conversation.title}`}
                          title="Đổi tên"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-tag text-ink-muted hover:bg-navy/8 hover:text-navy disabled:opacity-40 cursor-pointer"
                        >
                          <IconPencil size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onRequestDelete(conversation)}
                          aria-label={`Xóa cuộc trò chuyện ${conversation.title}`}
                          title="Xóa"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-tag text-ink-muted hover:bg-danger/10 hover:text-danger disabled:opacity-40 cursor-pointer"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {conversationsData && conversationsData.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border-subtle px-3 py-2.5 text-label-sm">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            disabled={!conversationsData.hasPreviousPage || busy}
            onClick={() => onPageChange(Math.max(1, pageIndex - 1))}
          >
            <IconChevronLeft size={15} />
            Trước
          </Button>
          <span className="text-ink-muted">
            {conversationsData.pageIndex}/{conversationsData.totalPages}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            disabled={!conversationsData.hasNextPage || busy}
            onClick={() => onPageChange(pageIndex + 1)}
          >
            Sau
            <IconChevronRight size={15} />
          </Button>
        </div>
      )}
    </div>
  );
}
