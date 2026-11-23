import { BASE, loadSettings } from "./core";

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}

export const NEED_SESSION =
  "Этот раздел сайт отдаёт только вошедшим.\nВставь cookie tracker_session в настройках плагина (кнопка с ключом сверху).";

export function headers(referer: string) {
  const s = loadSettings().session.trim();
  const out: Record<string, string> = {
    accept: "application/json",
    "accept-language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "cache-control": "no-cache",
    referer: BASE + referer,
  };
  if (s) out.cookie = `tracker_session=${s}`;
  return out;
}

export function explain(status: number, text: string, hasSession: boolean) {
  let msg = "";
  try {
    msg = JSON.parse(text)?.message || "";
  } catch {}
  if (status === 401)
    return hasSession ? "Сессия не принята (HTTP 401): похоже, tracker_session протухла. Возьми её заново." : NEED_SESSION;
  if (status === 403) return `Доступ закрыт (HTTP 403).${msg ? "\n" + msg : ""}`;
  if (status === 404) return "Сайт ничего не знает об этом пользователе.";
  if (status === 429) return "Слишком много запросов. Подожди немного.";
  return `HTTP ${status}${msg ? "\n" + msg : text ? "\n" + text.slice(0, 200) : ""}`;
}

export async function apiGet(path: string, referer: string): Promise<any> {
  const res: Response = await BdApi.Net.fetch(BASE + path, { method: "GET", headers: headers(referer) });
  const text = await res.text();
  if (!res.ok) throw new ApiError(explain(res.status, text, !!loadSettings().session.trim()), res.status);
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError("Ответ не JSON:\n" + text.slice(0, 200), res.status);
  }
}
