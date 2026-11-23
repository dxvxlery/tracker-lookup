import { h, useState, NAME, VERSION, loadSettings, patchSettings, myId, toast, type Settings } from "../core";
import { apiGet } from "../net";
import { clearCache, cacheSize } from "../cache";
import { parseSession } from "../parse";
import { UPDATE_URL, checkUpdate } from "../update";

type Check = { state: "idle" | "busy" | "ok" | "fail"; text?: string };

const kbd = (k: string) => h("kbd", null, k);
const code = (t: string) => h("code", null, t);
const Switch = ({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) =>
  h(
    "label",
    { className: "dt-s-row" },
    h("span", { className: "dt-s-label" }, label),
    h("input", { type: "checkbox", role: "switch", className: "dt-s-sw", checked: on, onChange: (e) => onChange(e.target.checked) }),
  );
const mask = (v: string) => (v.length > 10 ? `${v.slice(0, 4)}…${v.slice(-4)}` : "задана");

export function SettingsPanel() {
  const [s, setS] = useState<Settings>(loadSettings);
  const [paste, setPaste] = useState("");
  const [conn, setConn] = useState<Check>({ state: "idle" });
  const [size, setSize] = useState(cacheSize);
  const [busy, setBusy] = useState(false);
  const patch = (p: Partial<Settings>) => setS(patchSettings(p));

  const test = async () => {
    const id = myId();
    if (!id) return setConn({ state: "fail", text: "Не удалось узнать твой ID в Discord." });
    setConn({ state: "busy" });
    try {
      await apiGet(`/api/users/${id}/profile-context/voice`, `/profile/${id}`);
      setConn({ state: "ok", text: "Сайт принял сессию." });
    } catch (e: any) {
      setConn({ state: "fail", text: e?.message || String(e) });
    }
  };

  const apply = () => {
    const v = parseSession(paste);
    if (!v) return toast("Не нашёл tracker_session в этом тексте", "error");
    patch({ session: v });
    clearCache();
    setSize(0);
    setPaste("");
    setConn({ state: "idle" });
    toast("tracker_session сохранена", "success");
  };

  return h(
    "div",
    { className: "dt-s" },
    h(
      "section",
      null,
      h("h3", null, "Вход на discord-tracker.com"),
      h(
        "p",
        { className: "dt-s-hint" },
        "Комментарии сайт показывает всем. Профиль, серверы, знакомые, события, ники и сообщения — только вошедшим, для них нужна cookie ",
        code("tracker_session"),
        ".",
      ),
      h(
        "div",
        { className: "dt-s-row" },
        h("span", { className: "dt-s-label" }, "tracker_session"),
        h("span", { className: "dt-s-value" + (s.session ? "" : " is-empty") }, s.session ? mask(s.session) : "не задана"),
        s.session
          ? h(
              "button",
              {
                className: "dt-s-text is-danger",
                onClick: () => {
                  patch({ session: "" });
                  clearCache();
                  setConn({ state: "idle" });
                },
              },
              "Удалить",
            )
          : null,
      ),
      h(
        "div",
        { className: "dt-s-curl" },
        h("textarea", {
          className: "dt-s-input",
          rows: 2,
          value: paste,
          placeholder: "значение tracker_session или целиком cURL-запрос",
          onChange: (e) => setPaste(e.target.value),
        }),
        h("button", { className: "dt-s-btn is-primary", disabled: !paste.trim(), onClick: apply }, "Сохранить"),
      ),
      h(
        "div",
        { className: "dt-s-buttons" },
        h(
          "button",
          { className: "dt-s-btn", disabled: !s.session || conn.state === "busy", onClick: test },
          conn.state === "busy" ? "Проверяю…" : "Проверить",
        ),
        conn.state === "ok" ? h("span", { className: "dt-s-status is-ok" }, "✓ " + conn.text) : null,
      ),
      conn.state === "fail" ? h("p", { className: "dt-s-error" }, conn.text) : null,
      h(
        "div",
        { className: "dt-s-help" },
        h(
          "ol",
          null,
          h("li", null, "Войди на ", code("discord-tracker.com"), " в браузере."),
          h(
            "li",
            null,
            kbd("F12"),
            " → Application → Cookies → discord-tracker.com → двойной клик по значению ",
            code("tracker_session"),
            " → ",
            kbd("Ctrl+C"),
            ".",
          ),
          h("li", null, "Вставь сюда и нажми «Сохранить». Можно вставить и целиком «Copy as cURL» любого запроса сайта."),
        ),
        h("p", null, "Сессия хранится только в настройках плагина и уходит только на discord-tracker.com."),
      ),
    ),
    h(
      "section",
      null,
      h("h3", null, "Кеш"),
      h(
        "label",
        { className: "dt-s-row" },
        h("span", { className: "dt-s-label" }, "Хранить ответы, минут", h("small", null, "только в памяти, до перезапуска Discord")),
        h("input", {
          type: "number",
          min: 0,
          className: "dt-s-num",
          value: s.cacheMinutes,
          onChange: (e) => patch({ cacheMinutes: Number(e.target.value) }),
        }),
      ),
      h(
        "div",
        { className: "dt-s-row" },
        h("span", { className: "dt-s-label" }, `Сейчас в кеше ${size} ответов`),
        h(
          "button",
          {
            className: "dt-s-text is-danger",
            disabled: !size,
            onClick: () => {
              clearCache();
              setSize(0);
            },
          },
          "Очистить",
        ),
      ),
    ),
    h(
      "section",
      null,
      h("h3", null, "Обновления"),
      UPDATE_URL ? h(Switch, { label: "Проверять автоматически", on: s.autoUpdate, onChange: (v) => patch({ autoUpdate: v }) }) : null,
      h(
        "div",
        { className: "dt-s-row" },
        h("span", { className: "dt-s-label" }, `${NAME} ${VERSION}`),
        UPDATE_URL
          ? h(
              "button",
              {
                className: "dt-s-text",
                disabled: busy,
                onClick: async () => {
                  setBusy(true);
                  await checkUpdate(VERSION, true);
                  setBusy(false);
                },
              },
              busy ? "Проверяю…" : "Проверить обновления",
            )
          : null,
      ),
    ),
  );
}

export function openSettingsModal() {
  BdApi.UI.showConfirmationModal(NAME, h(SettingsPanel), { confirmText: "Готово", cancelText: null });
}
