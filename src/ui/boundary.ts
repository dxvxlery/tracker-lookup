import { h, type Node } from "../core";

interface Props {
  label: string;
  children?: Node;
}

interface BoundaryState {
  error: Error | null;
}

const Base: new (props: Props) => { props: Props; state: BoundaryState; setState: (s: BoundaryState) => void } = BdApi.React.Component;

export class Boundary extends Base {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(`[TrackerLookup] ${this.props.label}:`, error);
  }

  render() {
    if (!this.state.error) return this.props.children ?? null;
    return h(
      "div",
      { className: "dt-err" },
      h("b", null, `${this.props.label}: не удалось показать`),
      "Сайт вернул данные в неожиданном виде. Остальные вкладки работают.\n",
      h("code", null, String(this.state.error.message || this.state.error).slice(0, 200)),
      h(
        "div",
        { className: "dt-meta", style: { marginTop: 10 } },
        h("div", { className: "dt-meta-l" }),
        h("button", { className: "dt-chip", onClick: () => this.setState({ error: null }) }, "попробовать снова"),
      ),
    );
  }
}

export const guard = (label: string, el: Node) => h(Boundary as any, { label }, el);
