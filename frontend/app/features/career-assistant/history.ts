import type { CareerMessage } from "./chat";

export interface SavedConversation {
  id: string;
  title: string;
  cvId: string;
  jobId: string;
  updatedAt: string;
  messages: CareerMessage[];
}

type HistoryStorage = Pick<Storage, "getItem" | "setItem">;
const key = (userId: string) => `futurecv-career-history:${userId}`;

function isConversation(value: unknown): value is SavedConversation {
  const item = value as Partial<SavedConversation> | null;
  return !!item && typeof item.id === "string" && item.id.length > 0 && item.id.length <= 64 &&
    typeof item.title === "string" && item.title.length > 0 && item.title.length <= 80 &&
    typeof item.cvId === "string" && item.cvId.length <= 64 && typeof item.jobId === "string" && item.jobId.length <= 64 &&
    typeof item.updatedAt === "string" && Number.isFinite(Date.parse(item.updatedAt)) &&
    Array.isArray(item.messages) && item.messages.length > 0 && item.messages.length <= 40 &&
    item.messages.every((message) => !!message && (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string" && !!message.content.trim() && message.content.length <= (message.role === "user" ? 4000 : 16000));
}

// shortcut: browser-only history, use server storage when cross-device sync is required.
export function loadHistory(userId: string, storage?: HistoryStorage): SavedConversation[] | null {
  if (!userId) return [];
  try {
    const raw = (storage ?? window.localStorage).getItem(key(userId));
    if (!raw) return [];
    if (raw.length > 1_000_000) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.conversations) || data.conversations.length > 5 ||
      !data.conversations.every(isConversation) || new Set(data.conversations.map((item: SavedConversation) => item.id)).size !== data.conversations.length) return null;
    return data.conversations;
  } catch {
    return null;
  }
}

export function saveHistory(userId: string, conversations: SavedConversation[], storage?: HistoryStorage): boolean {
  if (!userId) return false;
  try {
    const recent = conversations.slice(0, 5);
    if (!recent.every(isConversation)) return false;
    const raw = JSON.stringify({ version: 1, conversations: recent });
    if (raw.length > 1_000_000) return false;
    (storage ?? window.localStorage).setItem(key(userId), raw);
    return true;
  } catch {
    return false;
  }
}
