import { h, useState, goChannel, type Node } from "../core";
import { api } from "../api";
import { fmtDay, fmtTime, fmtDate, relTime, toDate } from "../format";
import { EVENT_LABEL, EVENT_ICON, eventTone, eventFlags, dayKey } from "../parse";
import { useCursor, State, Empty, Seg, SortSelect, Search, More, IconBtn, match, delay } from "./common";

const ORDERS: Record<string, [string, string]> = {
  desc: ["desc", "сначала новые"],
  asc: ["asc", "сначала старые"],
};

const CATEGORIES = [
  ["activity", "микрофон · стрим · камера"],
  ["", "входы и выходы"],
];

function Event({ e, i }: { e: any; i: number }) {
  const t = String(e.event_type || "");
  const at = toDate(e.occurredAt || e.date);
  const flags = t === "state_update" || t === "state_sync" || t === "join" ? eventFlags(e) : [];
  const n = Number(e.companionCount ?? e.companion_count) || 0;
  return h(
    "div",
    { className: "dt-ses" + (t === "state_sync" ? " faded" : ""), style: delay(i) },
    h("div", { className: "dt-evi" }, EVENT_ICON[t] || "•"),
    h(
      "div",
      { className: "dt-main" },
      h(
        "div",
        { className: "dt-title" },
        h("span", { className: "dt-ev " + eventTone(t) }, EVENT_LABEL[t] || t),
        e.channel ? h("span", { className: "dt-evch" }, "🔊 " + e.channel) : null,
      ),
      h(
        "div",
        { className: "dt-sub" },
        e.guild ? h("span", null, e.guild) : null,
        n ? h("span", null, `👥 ещё ${n}`) : null,
        flags.map((f) => h("span", { key: f }, f)),
      ),
    ),
    h("div", { className: "dt-val", title: at ? `${fmtDate(at)} · ${relTime(at)}` : undefined }, at ? fmtTime(at) : "—"),
    e.guildId
      ? h(IconBtn, {
          icon: "ext",
          size: 14,
          className: "dt-sm",
          title: e.channelId ? "Перейти в канал" : "Открыть сервер",
          onClick: () => goChannel(e.guildId, e.channelId),
        })
      : null,
  );
}

export function EventsTab({ uid }: { uid: string }) {
  const [order, setOrder] = useState("desc");
  const [category, setCategory] = useState("activity");
  const [q, setQ] = useState("");
  const st = useCursor(
    (c, f) => api.timeline(uid, order, category, c, f),
    [uid, order, category],
    (x: any) => String(x.id),
  );
  return h(
    "div",
    null,
    h(Seg, { className: "dt-subtabs", value: category, onChange: setCategory, options: CATEGORIES }),
    State(
      {
        st,
        left: [
          h(Search, { key: "q", value: q, onChange: setQ, placeholder: "сервер или канал" }),
          h(SortSelect, { key: "o", value: order, options: ORDERS, onChange: setOrder }),
        ],
      },
      () => {
        if (!st.items.length) return h(Empty, { icon: "🔇", text: "Событий нет." });
        const list = st.items.filter((e: any) => match(q, e.guild, e.channel, EVENT_LABEL[e.event_type]));
        if (!list.length) return h(Empty, { icon: "🔎", text: "Ничего не подходит под поиск." });
        const rows: Node[] = [];
        let day = "";
        list.forEach((e: any, i: number) => {
          const k = dayKey(e.occurredAt || e.date);
          if (k !== day) rows.push(h("div", { key: "d" + i, className: "dt-day" }, fmtDay(e.occurredAt || e.date)));
          day = k;
          rows.push(h(Event, { key: e.id || i, e, i }));
        });
        return h("div", null, rows, h(More, { st }));
      },
    ),
  );
}
