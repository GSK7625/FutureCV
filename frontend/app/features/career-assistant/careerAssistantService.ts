import { fetcher } from "~/lib/fetcher";
import { prepareChat, type CareerMessage, type CareerChatResponse } from "./chat";

export const careerAssistantService = {
  chat: (message: string, history: CareerMessage[], cvId?: string, jobId?: string, signal?: AbortSignal) =>
    fetcher<CareerChatResponse>("/api/candidate/career-assistant/chat", {
      method: "POST", auth: true, body: prepareChat(message, history, cvId, jobId), timeoutMs: 100_000, signal,
    }),
};
