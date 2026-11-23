import { h, NAME, VERSION, loadSettings, toast } from "./core";
import { clearCache } from "./cache";
import { Lookup } from "./ui/lookup";
import { SettingsPanel } from "./ui/settings";
import { guard } from "./ui/boundary";
import { showChangelog } from "./changelog";
import { scheduleUpdates } from "./update";
import css from "./styles.css";

const MENUS = ["user-context", "guild-user-context", "user-profile-actions", "user-profile-overflow-menu"];
const ITEM = "tracker-lookup";

let mounted: { el: HTMLElement; root: any } | null = null;

function makeRoot(el: HTMLElement) {
  const RD = BdApi.ReactDOM;
  if (typeof RD?.createRoot === "function") return RD.createRoot(el);
  const client = BdApi.Webpack.getModule((m: any) => typeof m?.createRoot === "function" && typeof m?.hydrateRoot === "function");
  if (client) return client.createRoot(el);
  return { render: (n: any) => RD.render(n, el), unmount: () => RD.unmountComponentAtNode(el) };
}

function close() {
  if (!mounted) return;
  mounted.root.unmount();
  mounted.el.remove();
  mounted = null;
}

function open(user: any) {
  close();
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = makeRoot(el);
  mounted = { el, root };
  root.render(
    h(Lookup, {
      initial: {
        id: user.id,
        name: user.globalName || user.global_name || user.username,
        handle: user.username,
        avatar: typeof user.getAvatarURL === "function" ? user.getAvatarURL(null, 128, true) : null,
      },
      onClose: close,
    }),
  );
}

export default class TrackerLookup {
  unpatch: Array<() => void> = [];
  stopUpdates = () => {};

  start() {
    BdApi.DOM.addStyle(NAME, css);
    const patch = (tree: any, props: any) => {
      const user = props?.user;
      const kids = tree?.props?.children;
      if (!user?.id || !Array.isArray(kids) || kids.some((k: any) => k?.props?.id === ITEM)) return;
      kids.push(
        BdApi.ContextMenu.buildItem({ type: "separator" }),
        BdApi.ContextMenu.buildItem({ type: "text", id: ITEM, label: "Discord Tracker", action: () => open(user) }),
      );
    };
    this.unpatch = MENUS.map((m) => BdApi.ContextMenu.patch(m, patch));
    showChangelog();
    this.stopUpdates = scheduleUpdates(VERSION);
    if (!loadSettings().session) toast("TrackerLookup: без tracker_session видны только комментарии — добавь её в настройках", "info");
  }

  stop() {
    this.stopUpdates();
    this.unpatch.forEach((u) => u?.());
    this.unpatch = [];
    close();
    clearCache();
    BdApi.DOM.removeStyle(NAME);
  }

  getSettingsPanel() {
    return guard("Настройки", h(SettingsPanel));
  }
}
