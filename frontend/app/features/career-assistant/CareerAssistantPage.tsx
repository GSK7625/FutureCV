import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { Button } from "~/components/ui/Button";
import { useCandidateCvs } from "~/features/candidate/hooks/useCandidateCvs";
import { useJobList } from "~/features/candidate/hooks/useJobList";
import { careerAssistantService } from "./careerAssistantService";
import type { CareerMessage } from "./chat";
import { loadHistory, saveHistory, type SavedConversation } from "./history";
import { useAuthStore } from "~/stores/useAuthStore";

export function CareerAssistantPage() {
  const userId = useAuthStore((state) => state.user?.id) ?? "";
  const [params] = useSearchParams();
  const [cvId, setCvId] = useState("");
  const [jobId, setJobId] = useState(params.get("jobId") ?? "");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<CareerMessage[]>([]);
  const [saved, setSaved] = useState<SavedConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSnapshot, setActiveSnapshot] = useState("");
  const [historyReady, setHistoryReady] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const cvs = useCandidateCvs();
  const jobs = useJobList({ pageSize: 20, sortBy: "newest" });
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    const refresh = () => {
      const history = loadHistory(userId);
      if (history === null) setHistoryError("Không đọc được lịch sử trên trình duyệt. Tạm ngừng lưu để bảo vệ dữ liệu cũ; bạn vẫn có thể trò chuyện.");
      else { setSaved(history); setHistoryError(""); }
    };
    const changed = (event: StorageEvent) => { if (event.key === null || event.key === `futurecv-career-history:${userId}`) refresh(); };
    refresh();
    setHistoryReady(true);
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [userId]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest" }); }, [messages.length]);

  const persist = (update: (latest: SavedConversation[]) => SavedConversation[] | null) => {
    if (useAuthStore.getState().user?.id !== userId) return false;
    const latest = loadHistory(userId);
    if (latest === null) {
      setHistoryError("Không đọc được lịch sử. Chưa lưu nội dung mới để tránh ghi đè dữ liệu cũ.");
      return false;
    }
    const updated = update(latest);
    if (updated === null) {
      setHistoryError("Cuộc trò chuyện đã thay đổi hoặc bị xóa ở tab khác. Nội dung hiện tại chưa được lưu; hãy mở lại bản mới nhất trước khi tiếp tục.");
      return false;
    }
    const conversations = updated.slice(0, 5);
    // shortcut: concurrent tabs can still race between read/write; use server revisions for transactional sync.
    if (!saveHistory(userId, conversations)) {
      setHistoryError("Không lưu được lịch sử: trình duyệt có thể đã chặn hoặc hết dung lượng. Nội dung hiện tại vẫn còn trên trang.");
      return false;
    }
    setSaved(conversations.slice(0, 5));
    setHistoryError("");
    return true;
  };

  const chat = useMutation({
    mutationFn: async (text: string) => {
      abort.current = new AbortController();
      return careerAssistantService.chat(text, messages, cvId, jobId, abort.current.signal);
    },
    onSuccess: (response, text) => {
      if (abort.current?.signal.aborted || useAuthStore.getState().user?.id !== userId) return;
      const next: CareerMessage[] = [...messages, { role: "user", content: text } as const, { role: "assistant", content: response.reply } as const].slice(-40);
      setMessages(next);
      const id = activeId ?? crypto.randomUUID();
      const conversation: SavedConversation = { id, title: saved.find((item) => item.id === activeId)?.title ?? text.slice(0, 64), cvId, jobId, messages: next, updatedAt: new Date().toISOString() };
      if (persist((latest) => {
        if (activeId && JSON.stringify(latest.find((item) => item.id === activeId)) !== activeSnapshot) return null;
        return [conversation, ...latest.filter((item) => item.id !== id)];
      })) { setActiveId(id); setActiveSnapshot(JSON.stringify(conversation)); }
      setQuestion("");
    },
    retry: false,
  });

  const resetConversation = () => { setMessages([]); setActiveId(null); setActiveSnapshot(""); setQuestion(""); chat.reset(); };
  const openConversation = (conversation: SavedConversation) => {
    setMessages(conversation.messages);
    setActiveId(conversation.id);
    setActiveSnapshot(JSON.stringify(conversation));
    setCvId(conversation.cvId);
    setJobId(conversation.jobId);
    setQuestion("");
    chat.reset();
  };
  const deleteConversation = (conversation: SavedConversation) => {
    if (!window.confirm(`Xóa cuộc trò chuyện “${conversation.title}” khỏi trình duyệt này?`)) return;
    if (persist((latest) => latest.filter((item) => item.id !== conversation.id)) && activeId === conversation.id) resetConversation();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (question.trim() && !chat.isPending && historyReady) chat.mutate(question.trim());
  };
  const fieldClass = "mt-2 w-full rounded-default border border-border-subtle bg-surface p-3 text-navy focus-visible:outline-2 focus-visible:outline-navy disabled:opacity-50";

  return (
    <section className="mx-auto max-w-4xl space-y-6" aria-labelledby="career-title">
      <header>
        <h1 id="career-title" className="text-headline font-bold text-navy">Trợ lý nghề nghiệp AI</h1>
        <p className="mt-2 text-ink-muted">Hỏi về CV, kỹ năng cần bổ sung hoặc cách chuẩn bị cho công việc bạn muốn ứng tuyển.</p>
        <p className="mt-2 text-label-sm text-ink-muted">Bản thử nghiệm. AI có thể trả lời sai; hãy kiểm tra trước khi sử dụng. Lưu tối đa 5 cuộc trò chuyện gần nhất trên trình duyệt này, chưa đồng bộ sang thiết bị khác.</p>
      </header>

      <div className="rounded-default border border-border-subtle bg-surface p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-label font-semibold text-navy">CV dùng để tư vấn
            <select className={fieldClass} value={cvId} disabled={chat.isPending || cvs.isLoading} onChange={(event) => { setCvId(event.target.value); resetConversation(); }}>
              <option value="">Không dùng CV, hỏi tư vấn chung</option>
              {cvId && !cvs.data?.some((cv) => cv.id === cvId) && <option value={cvId}>CV của cuộc trò chuyện đã lưu</option>}
              {cvs.data?.map((cv) => <option key={cv.id} value={cv.id} disabled={cv.parseStatus !== "Parsed"}>{cv.title || "CV chưa đặt tên"}{cv.parseStatus !== "Parsed" ? " (chưa phân tích xong)" : ""}</option>)}
            </select>
          </label>
          <label className="text-label font-semibold text-navy">Việc làm tham khảo
            <select className={fieldClass} value={jobId} disabled={chat.isPending || jobs.isLoading} onChange={(event) => { setJobId(event.target.value); resetConversation(); }}>
              <option value="">Không chọn việc làm</option>
              {jobId && !jobs.data?.items.some((job) => job.id === jobId) && <option value={jobId}>Việc làm từ trang chi tiết</option>}
              {jobs.data?.items.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-3 text-label-sm text-ink-muted">Đổi CV hoặc việc làm sẽ bắt đầu cuộc trò chuyện mới. <Link className="underline" to="/candidate/cvs">Quản lý và phân tích CV</Link></p>
        {(cvs.error || jobs.error) && <p role="alert" className="mt-3 text-danger">Không tải được danh sách CV hoặc việc làm. <Button size="sm" variant="ghost" onClick={() => { void cvs.refetch(); void jobs.refetch(); }}>Thử tải lại</Button></p>}
      </div>

      <section aria-labelledby="career-history-title" className="rounded-default border border-border-subtle bg-surface p-5">
        <h2 id="career-history-title" className="text-body-lg font-semibold text-navy">Cuộc trò chuyện đã lưu</h2>
        <p className="mt-1 text-label-sm text-ink-muted">Mỗi cuộc giữ tối đa 40 tin nhắn. Trên máy dùng chung, hãy xóa các cuộc trò chuyện sau khi dùng.</p>
        {!saved.length && <p className="mt-3 text-ink-muted">Cuộc trò chuyện được lưu sau khi trợ lý trả lời thành công.</p>}
        <ul className="mt-3 space-y-2">
          {saved.map((conversation) => <li key={conversation.id} className="flex items-start gap-2 rounded-default border border-border-subtle p-2">
            <button type="button" className="min-w-0 flex-1 rounded-default p-2 text-left text-label text-navy focus-visible:outline-2 focus-visible:outline-navy disabled:opacity-50" disabled={chat.isPending} onClick={() => openConversation(conversation)} aria-current={activeId === conversation.id ? "true" : undefined}>
              <span className="block break-words font-semibold">{conversation.title}</span>
              <span className="mt-1 block text-label-sm text-ink-muted">{new Date(conversation.updatedAt).toLocaleString("vi-VN")}</span>
            </button>
            <Button size="sm" variant="ghost" disabled={chat.isPending} onClick={() => deleteConversation(conversation)} aria-label={`Xóa cuộc trò chuyện ${conversation.title}`}>Xóa</Button>
          </li>)}
        </ul>
        {historyError && <p role="alert" className="mt-3 text-danger">{historyError}</p>}
      </section>

      <div className="rounded-default border border-border-subtle bg-surface p-5">
        <div role="log" aria-label="Cuộc trò chuyện" aria-live="polite" aria-busy={chat.isPending} className="max-h-[32rem] space-y-4 overflow-y-auto">
          {!messages.length && <p className="py-6 text-ink-muted">Bạn có thể bắt đầu bằng: Tôi nên cải thiện phần giới thiệu trong CV như thế nào?</p>}
          {messages.map((message, index) => <article key={index} className={message.role === "user" ? "ml-6 rounded-default bg-navy/5 p-4" : "mr-6 border-l-2 border-gold pl-4"}>
            <p className="mb-2 text-label-sm font-semibold text-navy">{message.role === "user" ? "Bạn" : "Trợ lý nghề nghiệp"}</p>
            <p className="whitespace-pre-wrap break-words text-body text-ink-variant">{message.content}</p>
          </article>)}
          {chat.isPending && <p role="status" className="text-ink-muted">Đang chuẩn bị câu trả lời…</p>}
          <div ref={bottom} />
        </div>
        <form className="mt-6 border-t border-border-subtle pt-4" onSubmit={submit}>
          {!!chat.data?.suggestedFollowups.length && <div className="mb-4 flex flex-wrap gap-2" aria-label="Câu hỏi gợi ý">
            {chat.data.suggestedFollowups.map((text, index) => <Button key={index} size="sm" variant="ghost" className="h-auto whitespace-normal text-left" disabled={chat.isPending} onClick={() => setQuestion(text)}>{text}</Button>)}
          </div>}
          <label htmlFor="career-question" className="text-label font-semibold text-navy">Câu hỏi của bạn</label>
          <textarea id="career-question" rows={4} maxLength={4000} className={fieldClass} value={question} disabled={chat.isPending} onChange={(event) => setQuestion(event.target.value)} aria-describedby="career-question-help" />
          <p id="career-question-help" className="mt-1 text-label-sm text-ink-muted">{question.length}/4000 ký tự. Không nhập mật khẩu hoặc thông tin nhạy cảm.</p>
          {chat.error && <p role="alert" className="mt-3 text-danger">{chat.error.message} Câu hỏi vẫn được giữ để bạn gửi lại.</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <Button type="submit" disabled={!historyReady || chat.isPending || !question.trim()}>{chat.isPending ? "Đang gửi…" : "Gửi câu hỏi"}</Button>
            <Button variant="secondary" disabled={chat.isPending || !messages.length} onClick={resetConversation}>Cuộc trò chuyện mới</Button>
          </div>
        </form>
      </div>
    </section>
  );
}
