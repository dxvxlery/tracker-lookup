import { loadSettings } from "./core";
import { apiGet } from "./net";

export interface Loaded<T = any> {
  data: T;
  at: number;
  fromCache: boolean;
}

const MAX = 200;
const mem = new Map<string, { t: number; d: unknown }>();
const inflight = new Map<string, Promise<Loaded>>();

const ttl = () => {
  const m = Number(loadSettings().cacheMinutes);
  return (Number.isFinite(m) && m >= 0 ? m : 10) * 60e3;
};

export function clearCache() {
  mem.clear();
}

export const cacheSize = () => mem.size;

export function cachedGet(path: string, referer: string, force?: boolean): Promise<Loaded> {
  const max = ttl();
  const hit = mem.get(path);
  if (!force && max > 0 && hit && Date.now() - hit.t <= max) return Promise.resolve({ data: hit.d, at: hit.t, fromCache: true });
  const running = inflight.get(path);
  if (running) return running;
  const p = apiGet(path, referer)
    .then((data) => {
      const at = Date.now();
      if (max > 0) {
        mem.delete(path);
        mem.set(path, { t: at, d: data });
        while (mem.size > MAX) mem.delete(mem.keys().next().value as string);
      }
      return { data, at, fromCache: false };
    })
    .finally(() => inflight.delete(path));
  inflight.set(path, p);
  return p;
}
