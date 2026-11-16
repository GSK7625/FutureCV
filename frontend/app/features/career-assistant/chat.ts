export interface CareerMessage { role: "user" | "assistant"; content: string }
export interface CareerChatResponse { reply: string; suggestedFollowups: string[] }

export function prepareChat(message: string, history: CareerMessage[], cvId?: string, jobId?: string) {
  const question = message.trim();
  if (!question || question.length > 4000) throw new Error("Câu hỏi cần từ 1 đến 4000 ký tự.");
  return {
    message: question,
    history: history.slice(-20).map(({ role, content }) => ({ role, content: content.slice(0, 4000) })),
    cvId: cvId || null,
    jobId: jobId || null,
  };
}
