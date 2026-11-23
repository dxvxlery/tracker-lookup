import { h, useState, goChannel, BASE } from "../core";
import { api, type MessageKind } from "../api";
import { fmtNum, fmtDur, fmtDate, relTime, guildIcon, userAvatar } from "../format";
import { messageBody, attachmentInfo } from "../parse";
import { useCursor, State, Empty, Seg, Search, Avatar, IconBtn, More, match, delay } from "./common";
import { RichText } from "./info";
import type { Target } from "./summary";

const KINDS: [MessageKind, string][] = [
  ["delete", "удалённые"],
  ["edit", "изменённые"],
  ["mention", "упоминания"],
];

const abs = (u: string) => (/^https?:/.test(u) ? u : BASE + (u.startsWith("/") ? u : "/" + u));

function Message({ e, kind, uid, i, onOpen }: { e: any; kind: MessageKind; uid: string; i: number; onOpen: (t: Target) => void }) {
  const body = messageBody(e);
  const att = attachmentInfo(e);
  const at = e.occurredAt || e.date;
  const actor = String(e.actorUserId || "");
  const other = kind === "mention" && actor && actor !== uid;
  const later = Number(e.deleted_later);
  return h(
    "div",
    { className: "dt-cm", style: delay(i) },
    other
      ? h(Avatar, {
          className: "dt-av sm",
          src: userAvatar(actor, e.actorAvatarHash),
          name: e.actorName,
          seed: actor,
        })
      : h(Avatar, { className: "dt-gi sm", src: guildIcon(e.guildId, e.guildIconHash), name: e.guild, seed: e.guildId }),
    h(
      "div",
      { className: "dt-main" },
      h(
        "div",
        { className: "dt-cm-h" },
        other
          ? h(
              "button",
              {
                className: "dt-cm-name dt-link",
                onClick: () => onOpen({ id: actor, name: e.actorName, avatar: userAvatar(actor, e.actorAvatarHash, 128) }),
              },
              e.actorName || actor,
            )
          : null,
        h("span", { className: "dt-cm-sm" }, `${e.guild || ""}${e.channel ? " · #" + e.channel : ""}`),
        h("span", { className: "dt-cm-sm", title: fmtDate(at) }, relTime(at) || fmtDate(at)),
      ),
      body.before ? h("div", { className: "dt-cm-text del" }, h(RichText, { text: body.before })) : null,
      body.after ? h(RichText, { text: body.after }) : null,
      body.hidden ? h("div", { className: "dt-cm-text del" }, body.hidden) : null,
      att.count || later > 0
        ? h(
            "div",
            { className: "dt-cm-f" },
            att.count ? h("span", null, `📎 ${fmtNum(att.count)}${att.urls.length ? "" : " · недоступно"}`) : null,
            att.urls.map((u, k) =>
              h("a", { key: k, href: abs(u), onClick: (ev) => (ev.preventDefault(), window.open(abs(u), "_blank")) }, `вложение ${k + 1}`),
            ),
            later > 0 ? h("span", { title: "Сколько сообщение прожило до удаления" }, `⏱ удалено через ${fmtDur(later)}`) : null,
          )
        : null,
    ),
    e.guildId && e.channelId
      ? h(IconBtn, {
          icon: "ext",
          size: 14,
          className: "dt-sm",
          title: "Перейти в канал",
          onClick: () => goChannel(e.guildId, e.channelId),
        })
      : null,
  );
}

export function MessagesTab({ uid, onOpen }: { uid: string; onOpen: (t: Target) => void }) {
  const [kind, setKind] = useState<MessageKind>("delete");
  const [q, setQ] = useState("");
  const st = useCursor(
    (c, f) => api.messages(uid, kind, c, f),
    [uid, kind],
    (x: any) => String(x.id),
  );
  return h(
    "div",
    null,
    h(Seg, { className: "dt-subtabs", value: kind, onChange: (v) => setKind(v as MessageKind), options: KINDS }),
    State(
      {
        st,
        left: (d: any) => [
          h(Search, { key: "q", value: q, onChange: setQ, placeholder: "текст, канал, автор" }),
          d?.totalCount != null ? h("span", { key: "c", className: "dt-count" }, `всего ${fmtNum(d.totalCount)}`) : null,
        ],
      },
      () => {
        if (!st.items.length) return h(Empty, { icon: "✉️", text: "Таких сообщений нет." });
        const list = st.items.filter((e: any) => match(q, e.content, e.afterContent, e.beforeContent, e.channel, e.guild, e.actorName));
        if (!list.length) return h(Empty, { icon: "🔎", text: "Ничего не подходит под поиск." });
        return h(
          "div",
          null,
          list.map((e: any, i: number) => h(Message, { key: e.id, e, kind, uid, i, onOpen })),
          h(More, { st }),
        );
      },
    ),
  );
}
