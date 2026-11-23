import { h, useState, useEffect, useRef, type Node, type DomProps } from "../core";
import type { Loaded } from "../cache";
import { appendUnique } from "../parse";
import { hue, initials, relTime } from "../format";
import { openSettingsModal } from "./settings";

const P = {
  info: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z",
  friends:
    "M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 2c-2.7 0-8 1.3-8 4v3h16v-3c0-2.7-5.3-4-8-4Zm8 0c-.3 0-.7 0-1.1.1A4.7 4.7 0 0 1 17 17v3h7v-3c0-2.7-5.3-4-8-4Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4Z",
  nick: "M3 17.3V21h3.8L17.8 9.9l-3.7-3.7L3 17.3ZM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7L20.7 7Z",
  guilds: "M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z",
  chat: "M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z",
  close:
    "M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 0 0-1.4 1.4l4.9 4.9-4.9 4.9a1 1 0 1 0 1.4 1.4l4.9-4.9 4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4Z",
  back: "M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20v-2Z",
  ext: "M14 3v2h3.6l-9.8 9.8 1.4 1.4L19 6.4V10h2V3h-7ZM19 19H5V5h7V3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-7h-2v7Z",
  copy: "M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z",
  chev: "M9.3 6.7 10.7 5.3 17.4 12l-6.7 6.7-1.4-1.4L14.6 12 9.3 6.7Z",
  refresh: "M17.6 6.4A8 8 0 1 0 19.7 14h-2.1a6 6 0 1 1-1.4-6.2L13 11h7V4l-2.4 2.4Z",
  clock: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 11h-5v-2h3V6h2v7Z",
  search: "M15.5 14h-.8l-.3-.3A6.5 6.5 0 1 0 14 15.5l.3.3v.8l5 5 1.5-1.5-5-5Zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z",
  key: "M7 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4Zm5.6-4A6 6 0 1 0 12.6 14H16v4h4v-4h2v-4h-9.4Z",
};
export type IconName = keyof typeof P;

export const Icon = ({ name, size = 18 }: { name: IconName; size?: number }) =>
  h("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true }, h("path", { d: P[name] }));

interface IconBtnProps {
  icon: IconName;
  title: string;
  onClick: (e: any) => void;
  size?: number;
  className?: string;
  disabled?: boolean;
}
export const IconBtn = ({ icon, title, onClick, size = 18, className = "", disabled }: IconBtnProps) =>
  h("button", { className: "dt-ibtn " + className, title, "aria-label": title, onClick, disabled }, h(Icon, { name: icon, size }));

export const Chip = (props: DomProps, ...kids: Node[]) =>
  h(props.onClick ? "button" : "span", { ...props, className: "dt-chip " + (props.className || "") }, ...kids);

export interface LoadState<T = any> {
  loading: boolean;
  data: T | null;
  error: string | null;
  status?: number;
  at: number;
  fromCache: boolean;
  refresh: () => void;
}

export function useLoad<T = any>(fn: (force: boolean) => Promise<Loaded<T>>, deps: unknown[]): LoadState<T> {
  const [st, setSt] = useState<Omit<LoadState<T>, "refresh">>({ loading: true, data: null, error: null, at: 0, fromCache: false });
  const [nonce, setNonce] = useState(0);
  const force = useRef(false);
  useEffect(() => {
    let alive = true;
    const f = force.current;
    force.current = false;
    setSt((s) => ({ ...s, loading: true, error: null }));
    fn(f).then(
      (r) => alive && setSt({ loading: false, data: r.data, error: null, at: r.at, fromCache: r.fromCache }),
      (e: any) =>
        alive && setSt({ loading: false, data: null, error: e?.message || String(e), status: e?.status, at: 0, fromCache: false }),
    );
    return () => {
      alive = false;
    };
  }, [...deps, nonce]);
  return {
    ...st,
    refresh: () => {
      force.current = true;
      setNonce((n) => n + 1);
    },
  };
}

export interface CursorState<T = any> extends LoadState<any> {
  items: T[];
  next: string | null;
  more: () => void;
  loadingMore: boolean;
  moreError: string | null;
}

export function useCursor<T = any>(
  fn: (cursor: string | null, force: boolean) => Promise<Loaded>,
  deps: unknown[],
  key: (x: T) => string,
): CursorState<T> {
  const first = useLoad((f: boolean) => fn(null, f), deps);
  const [extra, setExtra] = useState<{ items: T[]; next: string | null; loading: boolean; error: string | null }>({
    items: [],
    next: null,
    loading: false,
    error: null,
  });
  const gen = useRef(0);
  useEffect(() => {
    gen.current++;
    setExtra({ items: [], next: null, loading: false, error: null });
  }, [first.data]);
  const base: T[] = Array.isArray(first.data?.items) ? first.data.items : [];
  const items = extra.items.length ? appendUnique(base, extra.items, key) : base;
  const next = extra.items.length || extra.error ? extra.next : (first.data?.nextCursor ?? null);
  const more = () => {
    if (!next || extra.loading) return;
    const g = gen.current;
    setExtra((s) => ({ ...s, loading: true, error: null }));
    fn(next, false).then(
      (r) =>
        g === gen.current &&
        setExtra((s) => ({
          items: appendUnique(s.items, Array.isArray(r.data?.items) ? r.data.items : [], key),
          next: r.data?.nextCursor ?? null,
          loading: false,
          error: null,
        })),
      (e: any) => g === gen.current && setExtra((s) => ({ ...s, next, loading: false, error: e?.message || String(e) })),
    );
  };
  return { ...first, items, next, more, loadingMore: extra.loading, moreError: extra.error };
}

export const More = ({ st, label = "показать ещё" }: { st: CursorState; label?: string }) =>
  st.next
    ? h(
        "div",
        { className: "dt-more" },
        st.moreError ? h("div", { className: "dt-err sm" }, st.moreError) : null,
        h(
          "button",
          { className: "dt-chip dt-more-btn" + (st.loadingMore ? " spin" : ""), disabled: st.loadingMore, onClick: st.more },
          st.loadingMore ? "загружаю…" : label,
        ),
      )
    : null;

function MetaBar({ st, left }: { st: LoadState; left?: Node }) {
  return h(
    "div",
    { className: "dt-meta" },
    h("div", { className: "dt-meta-l" }, left),
    st.fromCache ? Chip({ className: "cached", title: "Данные из кеша" }, `из кеша · ${relTime(st.at) || "только что"}`) : null,
    Chip(
      {
        className: "icon" + (st.loading ? " spin" : ""),
        title: "Обновить, мимо кеша",
        "aria-label": "Обновить",
        disabled: st.loading,
        onClick: st.refresh,
      },
      h(Icon, { name: "refresh", size: 14 }),
    ),
  );
}

export const Skeleton = ({ n = 5, className = "dt-skel" }: { n?: number; className?: string }) =>
  h(
    "div",
    null,
    Array.from({ length: n }, (_, i) => h("div", { key: i, className, style: { animationDelay: i * 0.08 + "s" } })),
  );

const authError = (st: LoadState) => st.status === 401 || /tracker_session/.test(st.error || "");

interface StateProps<T> {
  st: LoadState<T>;
  left?: Node | ((d: T | null) => Node);
  skeleton?: Node;
}

export function State<T>({ st, left, skeleton }: StateProps<T>, children: (d: T) => Node) {
  if (st.loading && st.data == null) return skeleton || h(Skeleton, {});
  if (st.error)
    return h(
      "div",
      null,
      h(
        "div",
        { className: "dt-err" },
        h("b", null, st.status === 401 ? "Нужен вход" : st.status === 429 ? "Слишком часто" : "Не получилось загрузить"),
        st.error,
      ),
      h(
        "div",
        { className: "dt-meta", style: { marginTop: 10 } },
        h("div", { className: "dt-meta-l" }),
        authError(st) ? Chip({ onClick: openSettingsModal }, "🔑 указать tracker_session") : null,
        Chip({ onClick: st.refresh }, h(Icon, { name: "refresh", size: 12 }), "повторить"),
      ),
    );
  return h(
    "div",
    { className: st.loading ? "dt-dim" : null },
    h(MetaBar, { st, left: typeof left === "function" ? left(st.data) : left }),
    children(st.data as T),
  );
}

export const Empty = ({ icon, text }: { icon: string; text: string }) =>
  h("div", { className: "dt-empty" }, h("div", { className: "big" }, icon), text);

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  seed?: unknown;
  className?: string;
  title?: string;
}
export function Avatar({ src, name, seed, className = "", title }: AvatarProps) {
  const [bad, setBad] = useState(false);
  useEffect(() => setBad(false), [src]);
  if (src && !bad) return h("img", { className, src, title, alt: "", onError: () => setBad(true) });
  return h(
    "div",
    { className: className + " ph", title, style: { background: `hsl(${hue(seed || name)},55%,45%)` } },
    initials(name || "?"),
  );
}

export const delay = (i: number) => ({ animationDelay: Math.min(i, 12) * 0.03 + "s" });

export const Stat = ({ k, v, sub, i = 0 }: { k: string; v: Node; sub?: Node; i?: number }) =>
  h(
    "div",
    { className: "dt-stat", style: delay(i) },
    h("div", { className: "k" }, k),
    h("div", { className: "v" }, v),
    sub ? h("div", { className: "r" }, sub) : null,
  );

interface SegProps {
  value: string;
  onChange: (v: string) => void;
  options: string[][];
  className?: string;
}
export const Seg = ({ value, onChange, options, className = "" }: SegProps) =>
  h(
    "div",
    { className: "dt-seg " + className },
    options.map(([k, label]) => h("button", { key: k, className: value === k ? "on" : "", onClick: () => onChange(k) }, label)),
  );

export const Search = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) =>
  h(
    "label",
    { className: "dt-search" },
    h(Icon, { name: "search", size: 14 }),
    h("input", { value, placeholder, onChange: (e) => onChange(e.target.value) }),
  );

export const match = (q: string, ...fields: unknown[]) => {
  const s = q.trim().toLowerCase();
  return (
    !s ||
    fields.some((f) =>
      String(f ?? "")
        .toLowerCase()
        .includes(s),
    )
  );
};

export const SortSelect = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Record<string, string[]>;
  onChange: (v: string) => void;
}) =>
  h(
    "select",
    { className: "dt-select", value, "aria-label": "Сортировка", onChange: (e) => onChange(e.target.value) },
    Object.entries(options).map(([k, o]) => h("option", { key: k, value: k }, o[o.length - 1])),
  );

export const Bar = ({ v, max }: { v: number; max: number }) =>
  h("div", { className: "dt-bar" }, h("i", { style: { width: Math.max(3, Math.min(100, (v / max) * 100)) + "%" } }));
