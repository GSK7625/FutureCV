import { fetcher } from "~/lib/fetcher";
import {
  prepareChat,
  type CareerMessage,
  type CareerChatResponse,
  type CareerConversationSummary,
  type CareerConversationDetail,
  type PagedCareerConversations,
} from "./chat";
import type { SavedConversation } from "./history";

export const careerAssistantService = {
  chat: (
    message: string,
    history: CareerMessage[],
    cvId?: string,
    jobId?: string,
    conversationId?: string | null,
    signal?: AbortSignal,
  ) =>
    fetcher<CareerChatResponse>("/api/candidate/career-assistant/chat", {
      method: "POST",
      auth: true,
      body: prepareChat(message, history, cvId, jobId, conversationId),
      timeoutMs: 100_000,
      signal,
    }),

  listConversations: (pageIndex = 1, pageSize = 10, signal?: AbortSignal) =>
    fetcher<PagedCareerConversations>(
      `/api/candidate/career-assistant/conversations?pageIndex=${pageIndex}&pageSize=${pageSize}`,
      { method: "GET", auth: true, signal },
    ),

  createConversation: (title?: string, cvId?: string, jobId?: string, signal?: AbortSignal) =>
    fetcher<CareerConversationSummary>("/api/candidate/career-assistant/conversations", {
      method: "POST",
      auth: true,
      body: { title: title?.trim() || null, cvId: cvId || null, jobId: jobId || null },
      signal,
    }),

  getConversationDetail: (conversationId: string, signal?: AbortSignal) =>
    fetcher<CareerConversationDetail>(`/api/candidate/career-assistant/conversations/${conversationId}`, {
      method: "GET",
      auth: true,
      signal,
    }),

  renameConversation: (conversationId: string, title: string, signal?: AbortSignal) =>
    fetcher<CareerConversationSummary>(`/api/candidate/career-assistant/conversations/${conversationId}`, {
      method: "PATCH",
      auth: true,
      body: { title: title.trim() },
      signal,
    }),

  deleteConversation: (conversationId: string, signal?: AbortSignal) =>
    fetcher<boolean>(`/api/candidate/career-assistant/conversations/${conversationId}`, {
      method: "DELETE",
      auth: true,
      signal,
    }),

  importConversations: (conversations: SavedConversation[], signal?: AbortSignal) =>
    fetcher<CareerConversationSummary[]>("/api/candidate/career-assistant/conversations/import", {
      method: "POST",
      auth: true,
      body: {
        conversations: conversations.map((c) => ({
          title: c.title,
          cvId: c.cvId || null,
          jobId: c.jobId || null,
          updatedAt: c.updatedAt,
          messages: c.messages,
        })),
      },
      signal,
    }),
};
