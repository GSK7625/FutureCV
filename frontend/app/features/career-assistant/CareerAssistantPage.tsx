import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconAlertCircle,
  IconHistory,
  IconPlus,
  IconSend,
  IconSparkles,
} from "@tabler/icons-react";
import { Badge, Button, Modal } from "~/components/ui";
import { useCandidateCvs } from "~/features/candidate/hooks/useCandidateCvs";
import { useJobDetail } from "~/features/candidate/hooks/useJobDetail";
import { usePreviewJobMatch } from "~/features/candidate/hooks/usePreviewJobMatch";
import type { Job } from "~/features/candidate/types";
import { useAuthStore } from "~/stores/useAuthStore";
import { useUIStore } from "~/stores/useUIStore";
import { careerAssistantService } from "./careerAssistantService";
import type { CareerConversationSummary, CareerMessage } from "./chat";
import { clearHistory, loadHistory, type SavedConversation } from "./history";
import { ChatThread } from "./components/ChatThread";
import { ContextMatchPanel } from "./components/ContextMatchPanel";
import { ConversationSidebar } from "./components/ConversationSidebar";
import { JobPickerModal } from "./components/JobPickerModal";

export function CareerAssistantPage() {
  const userId = useAuthStore((state) => state.user?.id) ?? "";
  const showToast = useUIStore((state) => state.showToast);
  const queryClient = useQueryClient();
  const [params] = useSearchParams();

  const [cvId, setCvId] = useState("");
  const [jobId, setJobId] = useState(params.get("jobId") ?? "");
  const [pickedJob, setPickedJob] = useState<Job | null>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<CareerMessage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeCvTitle, setActiveCvTitle] = useState<string | null>(null);
  const [activeJobTitle, setActiveJobTitle] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(1);
  const [actionError, setActionError] = useState("");
  const [suggestedFollowups, setSuggestedFollowups] = useState<string[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [failedQuestion, setFailedQuestion] = useState<string | null>(null);

  const [localLegacy, setLocalLegacy] = useState<SavedConversation[]>([]);
  const [dismissedLegacyBanner, setDismissedLegacyBanner] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CareerConversationSummary | null>(null);
  const [jobPickerOpen, setJobPickerOpen] = useState(false);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);

  const abort = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const cvInitialized = useRef(false);

  const cvs = useCandidateCvs();
  const jobDetail = useJobDetail(jobId || undefined);

  const selectedCv = cvs.data?.find((cv) => cv.id === cvId);
  const canShowMatch = Boolean(cvId && jobId && selectedCv?.parseStatus === "Parsed");
  const matchPreview = usePreviewJobMatch(jobId, cvId, canShowMatch);

  useEffect(() => () => abort.current?.abort(), []);

  useEffect(() => {
    const legacy = loadHistory(userId);
    setLocalLegacy(legacy ?? []);
    setDismissedLegacyBanner(false);
    setActiveId(null);
    setMessages([]);
    setSuggestedFollowups([]);
    setPendingQuestion(null);
    setFailedQuestion(null);
    setPageIndex(1);
    cvInitialized.current = false;
  }, [userId]);

  // Pre-select candidate's primary analyzed CV once on initial load if no conversation is open.
  useEffect(() => {
    if (cvInitialized.current || activeId || cvId || !cvs.data?.length) return;
    const parsedCvs = cvs.data.filter((cv) => cv.parseStatus === "Parsed");
    if (!parsedCvs.length) return;
    const preferred = parsedCvs.find((cv) => cv.isPrimary) ?? parsedCvs[0];
    cvInitialized.current = true;
    setCvId(preferred.id);
  }, [cvs.data, activeId, cvId]);

  // Close mobile drawer on Escape
  useEffect(() => {
    if (!mobileHistoryOpen) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setMobileHistoryOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileHistoryOpen]);

  const conversationsQuery = useQuery({
    queryKey: ["career-assistant", "conversations", userId, pageIndex],
    queryFn: ({ signal }) => careerAssistantService.listConversations(pageIndex, 10, signal),
    enabled: !!userId,
  });

  const invalidateConversations = () => {
    void queryClient.invalidateQueries({ queryKey: ["career-assistant", "conversations", userId] });
  };

  const resetToDraftSession = () => {
    setMessages([]);
    setActiveId(null);
    setActiveCvTitle(null);
    setActiveJobTitle(null);
    setSuggestedFollowups([]);
    setPendingQuestion(null);
    setFailedQuestion(null);
    setActionError("");
    chat.reset();
  };

  const chat = useMutation({
    mutationFn: async (text: string) => {
      abort.current?.abort();
      abort.current = new AbortController();
      setPendingQuestion(text);
      setFailedQuestion(null);
      return careerAssistantService.chat(text, [], cvId, jobId, activeId, abort.current.signal);
    },
    onSuccess: (response, text) => {
      if (abort.current?.signal.aborted || useAuthStore.getState().user?.id !== userId) return;
      const wasNewConversation = !activeId;
      setPendingQuestion(null);
      setFailedQuestion(null);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: response.reply },
      ]);
      setSuggestedFollowups(response.suggestedFollowups ?? []);
      if (response.conversationId) setActiveId(response.conversationId);
      if (wasNewConversation) setPageIndex(1);
      setActionError("");
      setQuestion("");
      invalidateConversations();
    },
    onError: (_, text) => {
      setPendingQuestion(null);
      setFailedQuestion(text);
    },
    retry: false,
  });

  const createConversation = useMutation({
    mutationFn: () => careerAssistantService.createConversation(undefined, cvId, jobId),
    onSuccess: (created) => {
      cvInitialized.current = true;
      setActiveId(created.id);
      setActiveCvTitle(created.cvTitle ?? null);
      setActiveJobTitle(created.jobTitle ?? null);
      setMessages([]);
      setSuggestedFollowups([]);
      setPendingQuestion(null);
      setFailedQuestion(null);
      setQuestion("");
      setActionError("");
      setPageIndex(1);
      setMobileHistoryOpen(false);
      chat.reset();
      invalidateConversations();
    },
    onError: (err) => setActionError(err.message),
  });

  const openConversation = useMutation({
    mutationFn: (conversationId: string) => careerAssistantService.getConversationDetail(conversationId),
    onSuccess: (detail) => {
      cvInitialized.current = true;
      setActiveId(detail.id);
      setCvId(detail.cvId ?? "");
      setJobId(detail.jobId ?? "");
      setPickedJob(null);
      setActiveCvTitle(detail.cvTitle ?? null);
      setActiveJobTitle(detail.jobTitle ?? null);
      setMessages(detail.messages.map((m) => ({ role: m.role, content: m.content })));
      setSuggestedFollowups([]);
      setPendingQuestion(null);
      setFailedQuestion(null);
      setQuestion("");
      setActionError("");
      setMobileHistoryOpen(false);
      chat.reset();
    },
    onError: (err) => setActionError(err.message),
  });

  const renameConversation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      careerAssistantService.renameConversation(id, title),
    onSuccess: () => {
      setActionError("");
      invalidateConversations();
      showToast("Đã đổi tên cuộc trò chuyện.", "success");
    },
    onError: (err) => setActionError(err.message),
  });

  const deleteConversation = useMutation({
    mutationFn: (id: string) => careerAssistantService.deleteConversation(id),
    onSuccess: (_, deletedId) => {
      if (activeId === deletedId) resetToDraftSession();
      setDeleteTarget(null);
      setActionError("");
      if ((conversationsQuery.data?.items.length ?? 0) <= 1 && pageIndex > 1) {
        setPageIndex((p) => Math.max(1, p - 1));
      }
      invalidateConversations();
      showToast("Đã xóa cuộc trò chuyện.", "success");
    },
    onError: (err) => {
      setDeleteTarget(null);
      setActionError(err.message);
    },
  });

  const importLegacy = useMutation({
    mutationFn: (items: SavedConversation[]) => careerAssistantService.importConversations(items),
    onSuccess: (imported) => {
      clearHistory(userId);
      setLocalLegacy([]);
      setImportModalOpen(false);
      setActionError("");
      setPageIndex(1);
      invalidateConversations();
      showToast(`Đã chuyển ${imported.length} cuộc trò chuyện lên tài khoản.`, "success");
    },
    onError: (err) => {
      setImportModalOpen(false);
      setActionError(err.message);
    },
  });

  const handleSelectCv = (nextCvId: string) => {
    cvInitialized.current = true;
    if (nextCvId === cvId) return;
    setCvId(nextCvId);
    if (activeId) {
      const hadMessages = messages.length > 0;
      resetToDraftSession();
      if (hadMessages) {
        showToast("Đã bắt đầu phiên hội thoại mới theo CV vừa chọn.", "info");
      }
    }
  };

  const handleSelectJob = (job: Job | null) => {
    const nextJobId = job?.id ?? "";
    if (nextJobId === jobId) return;
    setJobId(nextJobId);
    setPickedJob(job);
    setActiveJobTitle(job?.title ?? null);
    if (activeId) {
      const hadMessages = messages.length > 0;
      resetToDraftSession();
      if (hadMessages) {
        showToast("Đã bắt đầu phiên hội thoại mới theo việc làm vừa chọn.", "info");
      }
    }
  };

  const handlePickPrompt = (prompt: string) => {
    setQuestion(prompt);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const submitQuestion = () => {
    const trimmed = question.trim();
    if (!trimmed || busy) return;
    chat.mutate(trimmed);
  };

  const handleFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    submitQuestion();
  };

  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submitQuestion();
    }
  };

  const resolvedJob =
    pickedJob && pickedJob.id === jobId
      ? pickedJob
      : jobDetail.data && jobDetail.data.id === jobId
        ? jobDetail.data
        : null;

  const busy =
    chat.isPending ||
    openConversation.isPending ||
    createConversation.isPending ||
    renameConversation.isPending ||
    deleteConversation.isPending;

  const sidebarProps = {
    conversationsData: conversationsQuery.data,
    isLoading: conversationsQuery.isLoading,
    error: conversationsQuery.error,
    activeId,
    busy,
    creating: createConversation.isPending,
    renamingPending: renameConversation.isPending,
    pageIndex,
    localLegacyCount: localLegacy.length,
    showLegacyBanner: !dismissedLegacyBanner,
    importingLegacy: importLegacy.isPending,
    onPageChange: setPageIndex,
    onRetryList: () => void conversationsQuery.refetch(),
    onCreateNew: () => createConversation.mutate(),
    onOpenConversation: (id: string) => openConversation.mutate(id),
    onRenameConversation: async (id: string, title: string) => {
      await renameConversation.mutateAsync({ id, title });
    },
    onRequestDelete: (conversation: CareerConversationSummary) => setDeleteTarget(conversation),
    onRequestImportLegacy: () => setImportModalOpen(true),
    onDismissLegacyBanner: () => setDismissedLegacyBanner(true),
  };

  return (
    <section className="space-y-4" aria-labelledby="career-title">
      {/* Page Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 id="career-title" className="text-headline-md sm:text-headline font-bold text-navy">
              Trợ lý nghề nghiệp AI
            </h1>
            <Badge variant="gold" shape="pill">
              <IconSparkles size={12} />
              FutureCV AI
            </Badge>
          </div>
          <p className="mt-1 text-label text-ink-variant">
            Đánh giá độ phù hợp CV &amp; JD, phân tích kỹ năng thiếu, tối ưu Career Summary, viết Cover Letter và lộ trình nghề nghiệp.
          </p>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setMobileHistoryOpen(true)}
            aria-label="Mở lịch sử hội thoại"
          >
            <IconHistory size={16} />
            <span>
              Lịch sử
              {conversationsQuery.data ? ` (${conversationsQuery.data.totalCount})` : ""}
            </span>
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={busy || createConversation.isPending}
            onClick={() => createConversation.mutate()}
          >
            <IconPlus size={16} />
            <span>Mới</span>
          </Button>
        </div>
      </header>

      {actionError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-default border border-danger/25 bg-danger/5 px-4 py-3 text-label text-danger"
        >
          <span className="inline-flex items-center gap-2">
            <IconAlertCircle size={17} className="shrink-0" />
            {actionError}
          </span>
          <button
            type="button"
            onClick={() => setActionError("")}
            className="text-label-sm font-semibold underline cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Main Split Workbench */}
      <div className="flex min-h-[640px] lg:h-[calc(100vh-13rem)] overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-surface">
        {/* Desktop Sidebar */}
        <aside
          aria-labelledby="career-history-title"
          className="hidden w-80 shrink-0 border-r border-border-subtle lg:block"
        >
          <ConversationSidebar {...sidebarProps} />
        </aside>

        {/* Chat Workspace */}
        <div className="flex min-w-0 flex-1 flex-col bg-background/40">
          <ContextMatchPanel
            cvs={cvs.data ?? []}
            cvsLoading={cvs.isLoading}
            cvsError={cvs.error}
            selectedCvId={cvId}
            selectedCvTitleFallback={activeCvTitle}
            onSelectCv={handleSelectCv}
            onRetryCvs={() => void cvs.refetch()}
            selectedJobId={jobId}
            selectedJob={resolvedJob}
            selectedJobTitleFallback={activeJobTitle}
            jobLoading={jobDetail.isLoading}
            onOpenJobPicker={() => setJobPickerOpen(true)}
            onClearJob={() => handleSelectJob(null)}
            matchPreview={matchPreview.data}
            matchLoading={matchPreview.isLoading || matchPreview.isFetching}
            matchError={matchPreview.error}
            canShowMatch={canShowMatch}
            onRetryMatch={() => void matchPreview.refetch()}
            busy={busy}
          />

          <ChatThread
            messages={messages}
            activeId={activeId}
            detailLoading={openConversation.isPending}
            chatPending={chat.isPending}
            pendingQuestion={pendingQuestion}
            chatError={chat.error}
            failedQuestion={failedQuestion}
            suggestedFollowups={suggestedFollowups}
            onPickPrompt={handlePickPrompt}
            onRetryFailed={() => {
              if (failedQuestion && !busy) chat.mutate(failedQuestion);
            }}
            onCopySuccess={(label) => showToast(label, "success")}
          />

          {/* Input Composer */}
          <form
            onSubmit={handleFormSubmit}
            className="border-t border-border-subtle bg-surface p-3 sm:p-4"
          >
            <label htmlFor="career-question" className="sr-only">
              Câu hỏi của bạn
            </label>
            <div className="rounded-lg border border-border-strong bg-white p-2 transition-colors focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/15">
              <textarea
                ref={textareaRef}
                id="career-question"
                rows={3}
                maxLength={4000}
                value={question}
                disabled={chat.isPending}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Nhập câu hỏi về CV, điểm phù hợp, Cover Letter hoặc lộ trình phát triển… (Enter để gửi, Shift+Enter xuống dòng)"
                aria-describedby="career-question-help"
                className="w-full resize-none bg-transparent px-2 py-1 text-label text-ink placeholder:text-ink-muted/80 disabled:opacity-60"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-2 px-1">
                <p id="career-question-help" className="text-[11px] text-ink-muted">
                  {question.length}/4000 ký tự • Không nhập mật khẩu hoặc thông tin nhạy cảm • AI có thể sai sót, hãy kiểm tra lại.
                </p>
                <div className="flex items-center gap-2">
                  {(messages.length > 0 || activeId) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={resetToDraftSession}
                    >
                      Phiên mới
                    </Button>
                  )}
                  <Button
                    type="submit"
                    size="sm"
                    variant="primary"
                    disabled={busy || !question.trim()}
                  >
                    <IconSend size={15} />
                    <span>{chat.isPending ? "Đang gửi…" : "Gửi câu hỏi"}</span>
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Slide-Over History Drawer */}
      {mobileHistoryOpen && (
        <div
          className="fixed inset-0 z-overlay flex lg:hidden bg-navy/40 backdrop-blur-[4px]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMobileHistoryOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Lịch sử hội thoại"
            className="h-full w-80 max-w-[85vw] bg-surface shadow-overlay"
          >
            <ConversationSidebar
              {...sidebarProps}
              onCloseMobileDrawer={() => setMobileHistoryOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Searchable Paginated Job Picker Modal */}
      <JobPickerModal
        open={jobPickerOpen}
        selectedJobId={jobId}
        onClose={() => setJobPickerOpen(false)}
        onSelectJob={handleSelectJob}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Xóa cuộc trò chuyện"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={deleteConversation.isPending}
              onClick={() => deleteTarget && deleteConversation.mutate(deleteTarget.id)}
            >
              {deleteConversation.isPending ? "Đang xóa…" : "Xác nhận xóa"}
            </Button>
          </>
        }
      >
        <p className="text-label text-ink-variant">
          Bạn có chắc chắn muốn xóa cuộc trò chuyện{" "}
          <strong className="text-navy">“{deleteTarget?.title}”</strong>? Thao tác này sẽ ẩn toàn bộ lịch sử tin nhắn của cuộc trò chuyện này.
        </p>
      </Modal>

      {/* Optional Browser History Import Confirmation Modal */}
      <Modal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Đồng bộ lịch sử lên tài khoản"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setImportModalOpen(false)}>
              Để sau
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={importLegacy.isPending}
              onClick={() => importLegacy.mutate(localLegacy)}
            >
              {importLegacy.isPending ? "Đang chuyển…" : "Đồng ý chuyển lên tài khoản"}
            </Button>
          </>
        }
      >
        <p className="text-label text-ink-variant">
          Bạn đang có <strong className="text-navy">{localLegacy.length}</strong> cuộc trò chuyện lưu cục bộ trên trình duyệt này. Khi xác nhận đồng ý, các cuộc trò chuyện sẽ được tải lên tài khoản của bạn và xóa khỏi bộ nhớ trình duyệt.
        </p>
      </Modal>
    </section>
  );
}
