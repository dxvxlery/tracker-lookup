import { NAME, loadSettings, toast } from "./core";

export const UPDATE_URL: string = __UPDATE_URL__;
const EVERY = 6 * 3600e3;

export function newer(a: string, b: string) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0;
  }
  return false;
}

export const remoteVersion = (text: string) => /@version\s+([\d.]+)/.exec(text)?.[1] ?? null;

const valid = (text: string) => new RegExp(`@name\\s+${NAME}\\b`).test(text) && text.includes("module.exports");

function install(text: string, version: string) {
  try {
    const fs = require("fs");
    const path = require("path");
    const file = BdApi.Plugins.get(NAME)?.filename || `${NAME}.plugin.js`;
    fs.writeFileSync(path.join(BdApi.Plugins.folder, file), text);
    toast(`TrackerLookup обновлён до ${version}`, "success");
  } catch (e: any) {
    toast(`Не удалось записать обновление: ${e?.message || e}`, "error");
  }
}

export type UpdateResult = "off" | "latest" | "found" | "error";

export async function checkUpdate(current: string, manual = false): Promise<UpdateResult> {
  if (!UPDATE_URL) return "off";
  try {
    const res = await BdApi.Net.fetch(`${UPDATE_URL}?t=${Date.now()}`, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text: string = await res.text();
    const v = remoteVersion(text);
    if (!v || !valid(text)) throw new Error("файл обновления не похож на плагин");
    if (!newer(v, current)) {
      if (manual) toast(`У тебя последняя версия (${current})`, "success");
      return "latest";
    }
    BdApi.UI.showConfirmationModal("Доступно обновление", `TrackerLookup ${v} (у тебя ${current}). Обновить сейчас?`, {
      confirmText: "Обновить",
      cancelText: "Позже",
      onConfirm: () => install(text, v),
    });
    return "found";
  } catch (e: any) {
    if (manual) toast(`Проверка обновлений не удалась: ${e?.message || e}`, "error");
    return "error";
  }
}

export function scheduleUpdates(current: string) {
  if (!UPDATE_URL) return () => {};
  const run = () => loadSettings().autoUpdate && checkUpdate(current);
  const first = setTimeout(run, 15000);
  const timer = setInterval(run, EVERY);
  return () => {
    clearTimeout(first);
    clearInterval(timer);
  };
}
