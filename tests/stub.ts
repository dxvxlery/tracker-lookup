export const disk: Record<string, Record<string, unknown>> = {};
export const calls: Array<{ url: string; headers: Record<string, string> }> = [];
export let responses: Array<{ status: number; body: unknown }> = [];

export const setResponses = (r: typeof responses) => {
  responses = r;
};

const g = globalThis as any;
g.BdApi = {
  React: { createElement: () => null, useState: () => [], useEffect: () => {}, useRef: () => ({}), Component: class {} },
  Data: {
    load: (file: string, key: string) => disk[file]?.[key],
    save: (file: string, key: string, v: unknown) => {
      (disk[file] ??= {})[key] = JSON.parse(JSON.stringify(v));
    },
  },
  Net: {
    fetch: async (url: string, init: { headers: Record<string, string> }) => {
      calls.push({ url, headers: init.headers });
      const r = responses.shift() ?? { status: 200, body: { items: [] } };
      const text = typeof r.body === "string" ? r.body : JSON.stringify(r.body);
      return { status: r.status, ok: r.status >= 200 && r.status < 300, text: async () => text };
    },
  },
  UI: { showToast: () => {} },
};
