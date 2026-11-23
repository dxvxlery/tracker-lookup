import { guildIcon, toDate } from "./format";

export function parseSession(text: string): string | null {
  const t = String(text || "").trim();
  if (!t) return null;
  const m = /tracker_session=([A-Za-z0-9_\-.%]+)/.exec(t);
  if (m) return decodeURIComponent(m[1]);
  return /^[A-Za-z0-9_\-.]{16,}$/.test(t) ? t : null;
}

export interface Voice {
  live: boolean;
  guildId: string | null;
  guild: string | null;
  icon: string | null;
  channelId: string | null;
  channel: string | null;
  startedAt: Date | null;
  leftAt: Date | null;
  observedAt: Date | null;
}

export function parseVoice(j: any): Voice | null {
  const v = j?.voice;
  if (!v || typeof v !== "object" || (!v.guildId && !v.channelId)) return null;
  return {
    live: v.state === "current" && !v.leftAt,
    guildId: v.guildId ?? null,
    guild: v.guildName ?? null,
    icon: guildIcon(v.guildId, v.guildIconHash),
    channelId: v.channelId ?? null,
    channel: v.channelName ?? null,
    startedAt: toDate(v.startedAt),
    leftAt: toDate(v.leftAt),
    observedAt: toDate(v.observedAt),
  };
}

export const voiceHidden = (j: any) => j?.visibility?.voice != null && j.visibility.voice !== "visible";

export function appendUnique<T>(prev: T[], next: T[], key: (x: T) => string) {
  const seen = new Set(prev.map(key));
  return prev.concat(next.filter((x) => !seen.has(key(x)) && (seen.add(key(x)), true)));
}

export const EVENT_LABEL: Record<string, string> = {
  join: "зашёл в канал",
  leave: "вышел из войса",
  move: "перешёл в канал",
  switch: "перешёл в канал",
  state_sync: "состояние",
  state_update: "изменил состояние",
  stream_on: "включил стрим",
  stream_off: "выключил стрим",
  video_on: "включил камеру",
  video_off: "выключил камеру",
  mute_on: "выключил микрофон",
  mute_off: "включил микрофон",
  deaf_on: "выключил звук",
  deaf_off: "включил звук",
};

export const EVENT_ICON: Record<string, string> = {
  join: "➡️",
  leave: "⬅️",
  move: "🔀",
  switch: "🔀",
  state_sync: "🔄",
  state_update: "🔄",
  stream_on: "📺",
  stream_off: "📺",
  video_on: "📷",
  video_off: "📷",
  mute_on: "🎙️",
  mute_off: "🎙️",
  deaf_on: "🎧",
  deaf_off: "🎧",
};

export const eventTone = (t: string) => (/_on$|^join$/.test(t) ? "is-join" : /_off$|^leave$/.test(t) ? "is-leave" : "");

export function eventFlags(e: any) {
  return [
    (e.isSelfMuted || e.isMuted) && "🎙️ выкл",
    (e.isSelfDeafened || e.isDeafened) && "🎧 выкл",
    e.isStreaming && "📺 стрим",
    e.isVideoEnabled && "📷 камера",
  ].filter(Boolean) as string[];
}

export function dayKey(v: unknown) {
  const d = toDate(v);
  return d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : "";
}

export const NICK_SOURCE: Record<string, string> = {
  current_gateway_guild_name: "ник на сервере",
  gateway_guild_name: "ник на сервере",
  guild_nickname: "ник на сервере",
  global_profile_snapshot: "профиль",
};

export const nickSource = (s: unknown) => NICK_SOURCE[String(s)] || (/guild/.test(String(s)) ? "ник на сервере" : "профиль");

export function nickTitle(n: any) {
  return n.name || n.displayName || n.username || "—";
}

export function messageBody(e: any): { before: string | null; after: string | null; hidden: string | null } {
  const after = e.afterContent ?? e.content ?? null;
  const before = e.beforeContent ?? null;
  if (after || before) return { before: before && before !== after ? before : null, after, hidden: null };
  const len = Number(e.contentLength ?? e.afterContentLength);
  return { before: null, after: null, hidden: len > 0 ? `текст не сохранён · ${len} симв.` : null };
}

export function attachmentInfo(e: any) {
  const list: any[] = Array.isArray(e.attachments) ? e.attachments : [];
  const urls = list.map((a) => a?.contentUrl).filter((u): u is string => typeof u === "string" && !!u);
  const count = Math.max(Number(e.attachmentCount) || 0, list.length);
  return { count, urls };
}
