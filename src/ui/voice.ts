import { h, useState, useEffect, useRef, goChannel } from "../core";
import { api } from "../api";
import { fmtDur, fmtDate, relTime } from "../format";
import { parseVoice, voiceHidden, type Voice } from "../parse";
import { Avatar, IconBtn } from "./common";

const POLL = 30000;

interface St {
  loading: boolean;
  voice: Voice | null;
  hidden: boolean;
  error: string | null;
  status: number;
  at: number;
}

export function VoiceNow({ uid }: { uid: string }) {
  const [st, setSt] = useState<St>({ loading: true, voice: null, hidden: false, error: null, status: 0, at: 0 });
  const [, tick] = useState(0);
  const [nonce, setNonce] = useState(0);
  const lastAt = useRef(0);
  lastAt.current = st.at;

  useEffect(() => {
    let alive = true;
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(load, POLL);
    };
    const load = () => {
      if (document.hidden) return schedule();
      setSt((s) => ({ ...s, loading: true }));
      api
        .voiceNow(uid)
        .then(
          (j: any) =>
            alive && setSt({ loading: false, voice: parseVoice(j), hidden: voiceHidden(j), error: null, status: 0, at: Date.now() }),
          (e: any) => {
            stop = e?.status === 401;
            if (alive) setSt((s) => ({ ...s, loading: false, error: e?.message || String(e), status: e?.status || 0 }));
          },
        )
        .finally(() => alive && !stop && schedule());
    };
    const onVis = () => {
      if (!document.hidden && Date.now() - lastAt.current > POLL) load();
    };
    load();
    const clock = setInterval(() => !document.hidden && tick((n) => n + 1), 10000);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearTimeout(timer);
      clearInterval(clock);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [uid, nonce]);

  const v = st.voice;
  const refresh = h(IconBtn, {
    icon: "refresh",
    size: 16,
    className: st.loading ? "spin" : "",
    title: `Обновить (само — раз в ${POLL / 1000} с)`,
    onClick: () => setNonce((n) => n + 1),
  });
  const plain = (title: string, sub?: string | null) =>
    h(
      "div",
      { className: "dt-voice", title: st.error || undefined },
      h("div", { className: "dt-dot" }),
      h("div", { className: "vm" }, h("div", { className: "vt" }, title), sub ? h("div", { className: "vs" }, sub) : null),
      refresh,
    );

  if (st.error && !v) return plain(st.status === 401 ? "Где сейчас — только со входом" : "Онлайн не загрузился", st.error.split("\n")[0]);
  if (st.hidden && !v) return plain("Пользователь скрыл, где сидит", st.at ? `проверено ${relTime(st.at)}` : null);
  if (!v)
    return plain(
      st.loading && !st.at ? "Проверяю, где сейчас…" : "Нет данных о голосовых каналах",
      st.at ? `проверено ${relTime(st.at)}` : null,
    );

  const sitting = v.live && v.startedAt ? fmtDur((Date.now() - v.startedAt.getTime()) / 1000) : null;
  const left = v.leftAt || v.observedAt;

  return h(
    "div",
    { className: "dt-voice " + (v.live ? "on" : "last") },
    h(Avatar, { className: "gi", src: v.icon, name: v.guild || "?", seed: v.guildId }),
    h(
      "div",
      { className: "vm" },
      h(
        "div",
        { className: "vt" },
        h("span", { className: v.live ? "dt-live" : "dt-lastb" }, v.live ? "LIVE" : "БЫЛ"),
        h("span", { className: "vch" }, "🔊 " + (v.channel || "голосовой канал")),
      ),
      h(
        "div",
        { className: "vs" },
        h("span", null, v.guild || ""),
        v.live
          ? sitting
            ? h("span", { title: v.startedAt ? fmtDate(v.startedAt) : undefined }, `сидит ${sitting}`)
            : null
          : left
            ? h("span", { title: fmtDate(left) }, `вышел ${relTime(left)}`)
            : null,
      ),
    ),
    v.guildId && v.channelId
      ? h(IconBtn, { icon: "ext", size: 16, title: "Перейти в канал", onClick: () => goChannel(v.guildId!, v.channelId) })
      : null,
    refresh,
  );
}
