import { cachedGet } from "./cache";
import { apiGet } from "./net";

type Id = string;
const ref = (id: Id) => `/profile/${id}`;
const q = (params: Record<string, string | number | null | undefined>) =>
  Object.entries(params)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");

export type SummaryKind = "servers" | "friends";
export type MessageKind = "delete" | "edit" | "mention";

export const api = {
  profile: (id: Id, force?: boolean) => cachedGet(`/api/users/${id}`, ref(id), force),
  summary: (id: Id, kind: SummaryKind, sort: string, order: string, cursor: string | null, force?: boolean) =>
    cachedGet(`/api/users/${id}/activity-summary?${q({ kind, sort, order, limit: 100, cursor })}`, ref(id), force),
  timeline: (id: Id, order: string, category: string, cursor: string | null, force?: boolean) =>
    cachedGet(`/api/users/${id}/voice-timeline?${q({ limit: 100, order, category, cursor })}`, ref(id), force),
  nicknames: (id: Id, cursor: string | null, force?: boolean) =>
    cachedGet(`/api/users/${id}/nicknames?${q({ limit: 100, cursor })}`, ref(id), force),
  messages: (id: Id, eventType: MessageKind, cursor: string | null, force?: boolean) =>
    cachedGet(`/api/users/${id}/message-events?${q({ limit: 30, eventType, cursor })}`, ref(id), force),
  comments: (id: Id, cursor: string | null, force?: boolean) =>
    cachedGet(`/api/comments?${q({ targetType: "user", targetId: id, rootOnly: "true", limit: 15, cursor })}`, ref(id), force),
  voiceNow: (id: Id) => apiGet(`/api/users/${id}/profile-context/voice`, ref(id)),
};
