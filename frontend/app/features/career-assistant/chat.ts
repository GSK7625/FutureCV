export interface CareerMessage { role: "user" | "assistant"; content: string }
export interface CareerChatResponse { reply: string; suggestedFollowups: string[]; conversationId?: string | null }

export interface CareerConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface CareerConversationSummary {
  id: string;
  title: string;
  cvId?: string | null;
  cvTitle?: string | null;
  jobId?: string | null;
  jobTitle?: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CareerConversationDetail extends CareerConversationSummary {
  messages: CareerConversationMessage[];
}

export interface PagedCareerConversations {
  items: CareerConversationSummary[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export function prepareChat(
  message: string,
  history: CareerMessage[],
  cvId?: string,
  jobId?: string,
  conversationId?: string | null,
) {
  const question = message.trim();
  if (!question || question.length > 4000) throw new Error("Câu hỏi cần từ 1 đến 4000 ký tự.");
  return {
    message: question,
    history: history.slice(-20).map(({ role, content }) => ({ role, content: content.slice(0, 4000) })),
    cvId: cvId || null,
    jobId: jobId || null,
    conversationId: conversationId || null,
  };
}
