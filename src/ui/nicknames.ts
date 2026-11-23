import { h, useState, copy } from "../core";
import { api } from "../api";
import { fmtDate, relTime } from "../format";
import { nickSource, nickTitle } from "../parse";
import { useCursor, State, Empty, More, Seg, delay } from "./common";

export function NicknamesTab({ uid }: { uid: string }) {
  const [scope, setScope] = useState("");
  const st = useCursor(
    (c, f) => api.nicknames(uid, c, f),
    [uid],
    (x: any) => `${x.sampledAt || x.date}|${x.guildId || ""}|${nickTitle(x)}`,
  );
  return State(
    {
      st,
      left: (d: any) =>
        h(Seg, {
          value: scope,
          onChange: setScope,
          options: [
            ["", `все${d?.totalCount != null ? " " + d.totalCount : ""}`],
            ["guild", "на серверах"],
            ["profile", "профиль"],
          ],
        }),
    },
    () => {
      const list = st.items.filter((n: any) => !scope || (scope === "guild") === !!n.guildId);
      if (!list.length) return h(Empty, { icon: "🏷️", text: "История ников пуста." });
      return h(
        "div",
        null,
        h(
          "div",
          { className: "dt-tl" },
          list.map((n: any, i: number) => {
            const at = n.sampledAt || n.date;
            const guild = n.guildName || n.guild?.name || n.guild;
            return h(
              "div",
              { key: `${at}${i}`, className: "dt-tli" + (i === 0 ? " first" : ""), style: delay(i) },
              h(
                "div",
                { className: "dt-tli-row" },
                h(
                  "div",
                  { className: "dt-main" },
                  h("div", { className: "dt-title click", title: "Скопировать", onClick: () => copy(nickTitle(n), "Ник") }, nickTitle(n)),
                  h(
                    "div",
                    { className: "dt-sub" },
                    h("span", null, `${fmtDate(at)} · ${relTime(at)}`),
                    h("span", null, nickSource(n.source)),
                    n.username && n.username !== nickTitle(n) ? h("span", null, "@" + n.username) : null,
                  ),
                ),
                n.guildId
                  ? h(
                      "div",
                      { className: "dt-nick-g", title: n.guildId },
                      h("span", null, typeof guild === "string" && guild ? guild : `сервер ${n.guildId}`),
                    )
                  : null,
              ),
            );
          }),
        ),
        h(More, { st }),
      );
    },
  );
}
