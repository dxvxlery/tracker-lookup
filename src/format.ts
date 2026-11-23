type Val = unknown;

export const num = (v: Val): number | null => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

export const fmtNum = (v: Val) => {
  const n = num(v);
  return n == null ? "—" : n.toLocaleString("ru-RU");
};

export function fmtDur(v: Val) {
  const s = num(v);
  if (s == null || s <= 0) return "—";
  const d = Math.floor(s / 86400);
  const hh = Math.floor((s % 86400) / 3600);
  const mm = Math.floor((s % 3600) / 60);
  if (d) return hh ? `${d} д ${hh} ч` : `${d} д`;
  if (hh) return mm ? `${hh} ч ${mm} мин` : `${hh} ч`;
  if (mm) return `${mm} мин`;
  return `${Math.floor(s)} сек`;
}

export function fmtHours(v: Val) {
  const s = num(v);
  return s == null || s <= 0 ? "" : `${fmtNum(Math.floor(s / 3600))} ч ${Math.floor((s % 3600) / 60)} мин`;
}

export function toDate(v: Val): Date | null {
  if (v == null || v === "") return null;
  const d = v instanceof Date ? v : typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDate(v: Val) {
  const d = toDate(v);
  return d ? d.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

export const fmtDay = (v: Val) => toDate(v)?.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) ?? "—";

export const fmtTime = (d: Date) => d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

const REL: [number, string][] = [
  [31536000, "г"],
  [2592000, "мес"],
  [86400, "д"],
  [3600, "ч"],
  [60, "мин"],
];

export function relTime(v: Val) {
  const d = toDate(v);
  if (!d) return "";
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 0) return "";
  for (const [s, u] of REL) if (diff >= s) return `${Math.floor(diff / s)} ${u} назад`;
  return "только что";
}

export function hue(seed: Val) {
  let x = 0;
  for (const c of String(seed ?? "")) x = (x * 31 + c.charCodeAt(0)) >>> 0;
  return x % 360;
}

export const initials = (name: Val) =>
  String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => [...w][0])
    .join("")
    .toUpperCase();

const CDN = "https://cdn.discordapp.com/";
type Id = string | number | null | undefined;
const ext = (hash: string) => (hash.startsWith("a_") ? "gif" : "png");

export const userAvatar = (id: Id, hash?: string | null, size = 64) =>
  !hash ? null : /^https?:/.test(hash) ? hash : `${CDN}avatars/${id}/${hash}.${ext(hash)}?size=${size}`;

export const guildIcon = (id: Id, hash?: string | null, size = 64) =>
  hash && id ? `${CDN}icons/${id}/${hash}.${ext(hash)}?size=${size}` : null;
export const roleIcon = (id: Id, hash?: string | null) => (hash ? `${CDN}role-icons/${id}/${hash}.png?size=32` : null);
export const tagBadge = (guildId: Id, hash?: string | null) =>
  hash && guildId ? `${CDN}guild-tag-badges/${guildId}/${hash}.png?size=32` : null;
