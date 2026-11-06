import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { Button } from "~/components/ui/Button";
import { useCandidateCvs } from "~/features/candidate/hooks/useCandidateCvs";
import { useJobList } from "~/features/candidate/hooks/useJobList";
import { careerAssistantService } from "./careerAssistantService";
import type { CareerMessage } from "./chat";

export function CareerAssistantPage() {
  const [params] = useSearchParams();
  const [cvId, setCvId] = useState("");
  const [jobId, setJobId] = useState(params.get("jobId") ?? "");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<CareerMessage[]>([]);
  const cvs = useCandidateCvs();
  const jobs = useJobList({ pageSize: 20, sortBy: "newest" });
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest" }); }, [messages.length]);

  const chat = useMutation({
    mutationFn: async (text: string) => {
      abort.current = new AbortController();
      return careerAssistantService.chat(text, messages, cvId, jobId, abort.current.signal);
    },
    onSuccess: (response, text) => {
      setMessages((current) => [...current, { role: "user", content: text } as const, { role: "assistant", content: response.reply } as const].slice(-40));
      setQuestion("");
    },
    retry: false,
  });

  const resetConversation = () => { setMessages([]); chat.reset(); };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (question.trim() && !chat.isPending) chat.mutate(question.trim());
  };
  const fieldClass = "mt-2 w-full rounded-default border border-border-subtle bg-surface p-3 text-navy focus-visible:outline-2 focus-visible:outline-navy disabled:opacity-50";

  return (
    <section className="mx-auto max-w-4xl space-y-6" aria-labelledby="career-title">
      <header>
        <h1 id="career-title" className="text-headline font-bold text-navy">Trợ lý nghề nghiệp AI</h1>
        <p className="mt-2 text-ink-muted">Hỏi về CV, kỹ năng cần bổ sung hoặc cách chuẩn bị cho công việc bạn muốn ứng tuyển.</p>
        <p className="mt-2 text-label-sm text-ink-muted">Bản thử nghiệm. AI có thể trả lời sai; hãy kiểm tra trước khi sử dụng. Cuộc trò chuyện chỉ giữ trong trang hiện tại.</p>
      </header>

      <div className="rounded-default border border-border-subtle bg-surface p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-label font-semibold text-navy">CV dùng để tư vấn
            <select className={fieldClass} value={cvId} disabled={chat.isPending || cvs.isLoading} onChange={(event) => { setCvId(event.target.value); resetConversation(); }}>
              <option value="">Không dùng CV, hỏi tư vấn chung</option>
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
            <Button type="submit" disabled={chat.isPending || !question.trim()}>{chat.isPending ? "Đang gửi…" : "Gửi câu hỏi"}</Button>
            <Button variant="secondary" disabled={chat.isPending || !messages.length} onClick={resetConversation}>Cuộc trò chuyện mới</Button>
          </div>
        </form>
      </div>
    </section>
  );
}
