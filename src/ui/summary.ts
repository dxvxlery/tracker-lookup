import { h, useState, goChannel, copy } from "../core";
import { api, type SummaryKind } from "../api";
import { num, fmtNum, fmtDur, fmtHours, fmtDate, relTime, userAvatar, guildIcon, roleIcon } from "../format";
import { useCursor, State, Empty, Avatar, Icon, IconBtn, Search, SortSelect, More, Bar, match, delay } from "./common";

export interface Target {
  id: string;
  name?: string | null;
  handle?: string | null;
  avatar?: string | null;
}

const SORTS: Record<string, [string, string, string]> = {
  most: ["duration", "desc", "больше всего времени"],
  least: ["duration", "asc", "меньше всего времени"],
  recent: ["last", "desc", "последний раз — недавно"],
  stale: ["last", "asc", "последний раз — давно"],
  firstNew: ["first", "desc", "первый раз — недавно"],
  firstOld: ["first", "asc", "первый раз — давно"],
};

function Roles({ roles }: { roles: any[] }) {
  if (!roles.length) return null;
  const sorted = [...roles].sort((a, b) => (num(b.position) || 0) - (num(a.position) || 0));
  return h(
    "div",
    { className: "dt-rg-roles" },
    sorted.slice(0, 12).map((r) => {
      const icon = roleIcon(r.roleId, r.iconHash);
      const name =
        String(r.name || "")
          .replace(/[\u{E0000}-\u{E007F}]/gu, "")
          .trim() || "роль";
      return h(
        "span",
        {
          key: r.roleId,
          className: "dt-role",
          style: { "--rc": r.color && r.color !== "#000000" ? r.color : "#80848e" },
          title: `ID роли: ${r.roleId}${r.memberCount ? ` · ${fmtNum(r.memberCount)} человек` : ""}`,
        },
        icon ? h("img", { src: icon, alt: "" }) : h("i"),
        name,
      );
    }),
    sorted.length > 12 ? h("span", { className: "dt-role-kind" }, `+${sorted.length - 12}`) : null,
  );
}

function Row({
  x,
  kind,
  max,
  rank,
  i,
  onOpen,
}: {
  x: any;
  kind: SummaryKind;
  max: number;
  rank: number;
  i: number;
  onOpen: (t: Target) => void;
}) {
  const id = String(x.subjectId);
  const sec = num(x.durationSeconds) || 0;
  const isServer = kind === "servers";
  const src = isServer ? guildIcon(id, x.avatarHash) : userAvatar(id, x.avatarHash);
  const roles = Array.isArray(x.roles) ? x.roles : [];
  const staff = Array.isArray(x.staffRoles) ? x.staffRoles : [];
  const range = `${fmtDate(x.firstAt)} → ${fmtDate(x.lastAt)}`;
  const openIt = () => (isServer ? goChannel(id) : onOpen({ id, name: x.name, handle: x.name, avatar: userAvatar(id, x.avatarHash, 128) }));
  return h(
    "div",
    { className: "dt-fr", style: delay(i) },
    h(
      "div",
      { className: "dt-row click", title: isServer ? "Открыть сервер в Discord" : "Открыть профиль", onClick: openIt },
      h("div", { className: "dt-rank" + (rank <= 3 ? " top" : "") }, rank),
      h(Avatar, { className: isServer ? "dt-gi" : "dt-av", src, name: x.name, seed: id }),
      h(
        "div",
        { className: "dt-main" },
        h(
          "div",
          { className: "dt-title" },
          x.name || id,
          staff.length ? h("span", { className: "dt-tag", title: staff.map((r: any) => r.name).join(", ") }, "стафф") : null,
        ),
        h(
          "div",
          { className: "dt-sub" },
          h("span", { title: range }, `последний раз ${relTime(x.lastAt) || fmtDate(x.lastAt)}`),
          h("span", { title: range }, `с ${fmtDate(x.firstAt).split(",")[0]}`),
          num(x.messageCount) ? h("span", null, `💬 ${fmtNum(x.messageCount)}`) : null,
        ),
        h(Bar, { v: sec, max }),
      ),
      h("div", { className: "dt-val", title: fmtHours(sec) }, fmtDur(sec)),
      isServer
        ? null
        : h(IconBtn, {
            icon: "copy",
            size: 14,
            className: "dt-sm",
            title: "Скопировать ID",
            onClick: (e) => {
              e.stopPropagation();
              copy(id, "ID");
            },
          }),
      h("div", { className: "dt-go" }, h(Icon, { name: "chev", size: 16 })),
    ),
    isServer && roles.length ? h("div", { className: "dt-roles-wrap" }, h(Roles, { roles })) : null,
  );
}

export function SummaryTab({ uid, kind, onOpen }: { uid: string; kind: SummaryKind; onOpen: (t: Target) => void }) {
  const [sort, setSort] = useState("most");
  const [q, setQ] = useState("");
  const [by, order] = SORTS[sort];
  const st = useCursor(
    (c, f) => api.summary(uid, kind, by, order, c, f),
    [uid, kind, sort],
    (x: any) => String(x.subjectId),
  );
  return State(
    {
      st,
      left: [
        h(Search, { key: "q", value: q, onChange: setQ, placeholder: "поиск" }),
        h(SortSelect, { key: "s", value: sort, options: SORTS, onChange: setSort }),
        st.items.length ? h("span", { key: "c", className: "dt-count" }, `${fmtNum(st.items.length)}${st.next ? "+" : ""}`) : null,
      ],
    },
    () => {
      if (!st.items.length)
        return h(Empty, kind === "servers" ? { icon: "🏰", text: "Серверов не найдено." } : { icon: "🤝", text: "Знакомых не найдено." });
      const max = Math.max(1, ...st.items.map((x: any) => num(x.durationSeconds) || 0));
      const list = st.items.map((x: any, i: number) => [x, i + 1] as [any, number]).filter(([x]) => match(q, x.name, x.subjectId));
      if (!list.length) return h(Empty, { icon: "🔎", text: "Ничего не подходит под поиск." });
      return h(
        "div",
        null,
        list.map(([x, rank], i) => h(Row, { key: x.subjectId, x, kind, max, rank, i, onOpen })),
        h(More, { st }),
      );
    },
  );
}
