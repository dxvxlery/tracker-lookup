import { h, useState, useEffect, useRef, BASE, copy, loadSettings, patchSettings, type Node } from "../core";
import { api } from "../api";
import { hue, userAvatar } from "../format";
import { useLoad, Avatar, Icon, IconBtn, Chip, type IconName } from "./common";
import { InfoTab } from "./info";
import { SummaryTab, type Target } from "./summary";
import { EventsTab } from "./events";
import { NicknamesTab } from "./nicknames";
import { MessagesTab } from "./messages";
import { VoiceNow } from "./voice";
import { openSettingsModal } from "./settings";
import { guard } from "./boundary";

const TABS: [string, string, IconName][] = [
  ["info", "Инфо", "info"],
  ["servers", "Серверы", "guilds"],
  ["friends", "Знакомые", "friends"],
  ["events", "События", "clock"],
  ["nicknames", "Ники", "nick"],
  ["messages", "Сообщения", "chat"],
];

const FOCUSABLE = "button:not([disabled]),input,select,textarea,a[href],[tabindex]:not([tabindex='-1'])";

function trapFocus(e: KeyboardEvent, root: HTMLElement | null) {
  if (e.key !== "Tab" || !root) return;
  const els = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);
  if (!els.length) return;
  const first = els[0];
  const last = els[els.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  } else if (!root.contains(document.activeElement)) {
    e.preventDefault();
    first.focus();
  }
}

export function Lookup({ initial, onClose }: { initial: Target; onClose: () => void }) {
  const [stack, setStack] = useState<Target[]>([initial]);
  const [tab, setTabState] = useState(() => (TABS.some(([k]) => k === loadSettings().lastTab) ? loadSettings().lastTab : "info"));
  const card = useRef<HTMLElement | null>(null);
  const cur = stack[stack.length - 1];
  const info = useLoad((f: boolean) => api.profile(cur.id, f), [cur.id]);
  const u = info.data && typeof info.data === "object" ? info.data : null;

  const setTab = (k: string) => {
    setTabState(k);
    patchSettings({ lastTab: k });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("[role=dialog] .dt-s")) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else trapFocus(e, card.current);
    };
    window.addEventListener("keydown", onKey, true);
    card.current?.querySelector<HTMLElement>(".dt-tab.on")?.focus();
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const hh = hue(cur.id);
  const name = u?.displayName || u?.username || cur.name || cur.id;
  const handle = u?.username || cur.handle;
  const open = (x: Target) => {
    if (x.id === cur.id) return;
    setStack([...stack, x]);
  };

  const body = (
    {
      info: () => h(InfoTab, { st: info, uid: cur.id }),
      servers: () => h(SummaryTab, { uid: cur.id, kind: "servers", onOpen: open }),
      friends: () => h(SummaryTab, { uid: cur.id, kind: "friends", onOpen: open }),
      events: () => h(EventsTab, { uid: cur.id }),
      nicknames: () => h(NicknamesTab, { uid: cur.id }),
      messages: () => h(MessagesTab, { uid: cur.id, onOpen: open }),
    } as Record<string, () => Node>
  )[tab];

  return h(
    "div",
    { className: "dt-overlay", onMouseDown: (e) => e.target === e.currentTarget && onClose() },
    h(
      "div",
      {
        ref: card,
        className: "dt-card",
        role: "dialog",
        "aria-modal": true,
        "aria-label": `Discord Tracker: ${name}`,
        style: {
          "--dt-accent": `hsl(${hh},70%,58%)`,
          "--dt-accent2": `hsl(${(hh + 40) % 360},75%,62%)`,
          "--dt-accent-a": `hsla(${hh},70%,58%,.35)`,
        },
      },
      h(
        "div",
        { className: "dt-banner", style: { background: `linear-gradient(135deg,hsl(${hh},65%,45%),hsl(${(hh + 50) % 360},70%,35%))` } },
        h(
          "div",
          { className: "dt-topbtns" },
          stack.length > 1 ? h(IconBtn, { icon: "back", title: "Назад", onClick: () => setStack(stack.slice(0, -1)) }) : null,
          h("div", { className: "sp" }),
          h(IconBtn, { icon: "key", title: "Настройки плагина", onClick: openSettingsModal }),
          h(IconBtn, { icon: "ext", title: "Открыть на сайте", onClick: () => window.open(`${BASE}/profile/${cur.id}`, "_blank") }),
          h(IconBtn, { icon: "close", title: "Закрыть (Esc)", onClick: onClose }),
        ),
      ),
      h(
        "div",
        { className: "dt-head" },
        h(Avatar, { className: "dt-ava", src: cur.avatar || (u && userAvatar(cur.id, u.avatarHash, 128)), name, seed: cur.id }),
        h(
          "div",
          { className: "dt-who" },
          h("div", { className: "dt-name" }, name),
          h(
            "div",
            { className: "dt-handle" },
            handle ? h("span", null, "@" + handle) : null,
            Chip({ title: "Скопировать ID", onClick: () => copy(cur.id, "ID") }, h(Icon, { name: "copy", size: 12 }), cur.id),
            stack.length > 1 ? Chip({}, `шаг ${stack.length}`) : null,
          ),
        ),
      ),
      h("div", { key: "v" + cur.id }, guard("Где сейчас", h(VoiceNow, { uid: cur.id }))),
      h(
        "div",
        { className: "dt-tabs", role: "tablist" },
        TABS.map(([k, label, icon]) =>
          h(
            "button",
            { key: k, role: "tab", "aria-selected": tab === k, className: "dt-tab" + (tab === k ? " on" : ""), onClick: () => setTab(k) },
            h(Icon, { name: icon, size: 16 }),
            label,
          ),
        ),
      ),
      h(
        "div",
        { className: "dt-body", key: cur.id + tab, role: "tabpanel" },
        guard(TABS.find(([k]) => k === tab)?.[1] || "Вкладка", body()),
      ),
    ),
  );
}
