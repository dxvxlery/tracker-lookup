export const NAME = "TrackerLookup";
export const BASE = "https://discord-tracker.com";
export const VERSION: string = __VERSION__;

export type Node = any;
export interface DomProps {
  [k: string]: any;
  onClick?: (e: any) => void;
  onChange?: (e: any) => void;
  onMouseDown?: (e: any) => void;
  onError?: (e: any) => void;
}
export const h = BdApi.React.createElement as {
  (type: () => Node): Node;
  <P>(type: (p: P) => Node, props: P, ...kids: Node[]): Node;
  (type: string, props?: DomProps | null, ...kids: Node[]): Node;
};
export const { useState, useEffect, useRef } = BdApi.React as {
  useState: <T>(v: T | (() => T)) => [T, (v: T | ((p: T) => T)) => void];
  useEffect: (fn: () => void | (() => void), deps?: unknown[]) => void;
  useRef: <T>(v: T) => { current: T };
};

export interface Settings {
  session: string;
  cacheMinutes: number;
  lastTab: string;
  autoUpdate: boolean;
  lastVersion: string;
}

const DEFAULTS: Settings = { session: "", cacheMinutes: 10, lastTab: "info", autoUpdate: true, lastVersion: "" };

export const loadSettings = (): Settings => ({ ...DEFAULTS, ...(BdApi.Data.load(NAME, "settings") || {}) });

export function patchSettings(patch: Partial<Settings>): Settings {
  const next = { ...loadSettings(), ...patch };
  BdApi.Data.save(NAME, "settings", next);
  return next;
}

export function toast(text: string, type: "info" | "success" | "error" | "warning" = "info") {
  BdApi.UI.showToast(text, { type });
}

export function copy(text: unknown, what: string) {
  try {
    DiscordNative.clipboard.copy(String(text));
  } catch {
    navigator.clipboard?.writeText(String(text));
  }
  toast(`${what} скопирован`, "success");
}

let nav: any;
export function goChannel(guildId: string, channelId?: string | null) {
  const path = `/channels/${guildId}${channelId ? "/" + channelId : ""}`;
  try {
    nav ??=
      BdApi.Webpack.getByKeys("transitionTo") ||
      BdApi.Webpack.getModule((m: any) => typeof m?.transitionTo === "function", { searchExports: true });
    if (nav?.transitionTo) return nav.transitionTo(path);
  } catch {}
  copy("https://discord.com" + path, "Ссылка");
}

export const myId = (): string | null => {
  try {
    return BdApi.Webpack.getStore?.("UserStore")?.getCurrentUser?.()?.id ?? null;
  } catch {
    return null;
  }
};
