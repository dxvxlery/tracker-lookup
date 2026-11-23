import { VERSION, loadSettings, patchSettings } from "./core";
import { newer } from "./update";
import { RELEASES, type Notes } from "./releases";

export { RELEASES, VERSION };

const KIND: [keyof Notes, string, string][] = [
  ["added", "Новое", "added"],
  ["improved", "Улучшено", "improved"],
  ["fixed", "Исправлено", "fixed"],
];

export function changesSince(prev: string) {
  const fresh = RELEASES.filter((r) => newer(r.version, prev) && !newer(r.version, VERSION));
  return KIND.map(([key, title, type]) => ({ title, type, items: fresh.flatMap((r) => r.ru[key] ?? []) })).filter((c) => c.items.length);
}

export function showChangelog() {
  const prev = loadSettings().lastVersion;
  patchSettings({ lastVersion: VERSION });
  if (!prev || prev === VERSION) return;
  const changes = changesSince(prev);
  if (changes.length) BdApi.UI.showChangelogModal({ title: "TrackerLookup", subtitle: `Версия ${VERSION}`, changes });
}
