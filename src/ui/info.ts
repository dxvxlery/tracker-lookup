import { h, type Node } from "../core";
import { api } from "../api";
import { fmtNum, fmtDur, fmtHours, fmtDate, relTime, userAvatar } from "../format";
import { useCursor, State, Empty, Avatar, Stat, More, delay, type LoadState } from "./common";
import { guard } from "./boundary";

export const RichText = ({ text }: { text?: string | null }) =>
  h(
    "div",
    { className: "dt-cm-text" },
    String(text || "")
      .split(/(https?:\/\/[^\s<>"']+)/g)
      .map((p, i) =>
        /^https?:\/\//.test(p)
          ? h(
              "a",
              {
                key: i,
                href: p,
                onClick: (e) => {
                  e.preventDefault();
                  window.open(p, "_blank");
                },
              },
              p,
            )
          : p,
      ),
  );

function Comment({ c, uid, i }: { c: any; uid: string; i: number }): Node {
  const a = c.author || {};
  const anon = c.isAnonymous || !a.discordUserId;
  const name = anon ? "Аноним" : a.username || a.discordUserId;
  const r = c.reactionSummary || {};
  return h(
    "div",
    { className: "dt-cm" + (c.isPinned ? " pinned" : ""), style: delay(i) },
    anon
      ? h("div", { className: "dt-av sm ph", style: { background: "#4e5058" } }, "?")
      : h(Avatar, { className: "dt-av sm", src: userAvatar(a.discordUserId, a.avatarHash), name, seed: a.discordUserId }),
    h(
      "div",
      { className: "dt-main" },
      h(
        "div",
        { className: "dt-cm-h" },
        h("span", { className: "dt-cm-name" }, name),
        !anon && a.discordUserId === uid ? h("span", { className: "dt-tag" }, "сам о себе") : null,
        c.isPinned ? h("span", { className: "dt-tag pin" }, "📌 закреплён") : null,
        h("span", { className: "dt-cm-sm", title: fmtDate(c.createdAt) }, relTime(c.createdAt) || fmtDate(c.createdAt)),
        c.updatedAt && c.updatedAt !== c.createdAt ? h("span", { className: "dt-cm-sm" }, "· изменён") : null,
      ),
      c.moderationStatus && c.moderationStatus !== "published"
        ? h("div", { className: "dt-cm-text del" }, "комментарий скрыт")
        : h(RichText, { text: c.content }),
      r.likes || r.dislikes || c.replyCount || c.imageAssetId
        ? h(
            "div",
            { className: "dt-cm-f" },
            r.likes ? h("span", null, `👍 ${fmtNum(r.likes)}`) : null,
            r.dislikes ? h("span", null, `👎 ${fmtNum(r.dislikes)}`) : null,
            c.replyCount ? h("span", null, `💬 ${fmtNum(c.replyCount)} ответов`) : null,
            c.imageAssetId ? h("span", null, "🖼 картинка") : null,
          )
        : null,
    ),
  );
}

function Comments({ uid }: { uid: string }) {
  const st = useCursor(
    (c, f) => api.comments(uid, c, f),
    [uid],
    (x: any) => String(x.commentId),
  );
  return h(
    "div",
    null,
    h("div", { className: "dt-sect" }, "Комментарии"),
    State({ st }, () => {
      if (!st.items.length) return h(Empty, { icon: "💬", text: "О пользователе ещё никто не писал." });
      return h(
        "div",
        null,
        st.items.map((c: any, i: number) => h(Comment, { key: c.commentId, c, uid, i })),
        h(More, { st }),
      );
    }),
  );
}

const STATS: [string, string][] = [
  ["voiceStateEventCount", "Голосовых событий"],
  ["coActivityFactCount", "Совместных сессий"],
  ["serverActivityFactCount", "Записей по серверам"],
  ["messageEventCount", "Событий сообщений"],
  ["roleEventCount", "Изменений ролей"],
  ["membershipEventCount", "Входов/выходов"],
  ["profileSnapshotCount", "Снимков профиля"],
  ["mediaDiscoveredItemCount", "Медиа"],
];

export function InfoTab({ st, uid }: { st: LoadState; uid: string }) {
  const profile =
    st.status === 401
      ? h(
          "div",
          { className: "dt-err" },
          h("b", null, "Статистика только для вошедших"),
          "Комментарии ниже видны и без входа. Чтобы видеть остальное, укажи tracker_session в настройках.",
        )
      : State({ st }, (u: any) => {
          if (!u || typeof u !== "object") return h(Empty, { icon: "🕵️", text: "Сайт ничего не знает об этом пользователе." });
          const a = u.activity || {};
          const tiles: [string, Node, Node?][] = [
            ["Время в войсе", fmtDur(a.totalVoiceDurationSeconds), fmtHours(a.totalVoiceDurationSeconds)],
            ["Последний раз в войсе", fmtDate(a.lastVoiceAt), relTime(a.lastVoiceAt)],
            ["Просмотров профиля", fmtNum(a.profileViewCount)],
            ...STATS.filter(([k]) => a[k] != null).map(([k, label]): [string, Node] => [label, fmtNum(a[k])]),
          ];
          const about = u.latestProfileSnapshot?.aboutMe;
          return h(
            "div",
            null,
            h(
              "div",
              { className: "dt-grid" },
              tiles.map(([k, v, sub], i) => h(Stat, { key: k, k, v, sub, i })),
            ),
            about ? [h("div", { key: "ah", className: "dt-sect" }, "Обо мне"), h(RichText, { key: "a", text: about })] : null,
            u.isBot ? h("div", { className: "dt-sect" }, "🤖 Это бот") : null,
          );
        });
  return h("div", null, profile, guard("Комментарии", h(Comments, { uid })));
}
