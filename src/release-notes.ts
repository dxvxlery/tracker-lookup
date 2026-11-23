import { RELEASES, type Notes, type Release } from "./releases.ts";

export const EN: Record<string, Notes> = {
  "1.0.0": {
    added: [
      "A discord-tracker.com profile window on right-click of any member.",
      "Current voice channel, servers and people they spend time with, with sorting.",
      "Voice events, nickname history, deleted and edited messages, mentions and profile comments.",
      "Self-update from the GitHub repository and a what's-new window after updating.",
    ],
  },
};

const HEADINGS: [keyof Notes, string][] = [
  ["added", "Added"],
  ["improved", "Improved"],
  ["fixed", "Fixed"],
];

export function releaseMarkdown(r: Release) {
  const n = EN[r.version] ?? {};
  return HEADINGS.filter(([k]) => n[k]?.length)
    .map(([k, title]) => `### ${title}\n\n${n[k]!.map((i) => `- ${i}`).join("\n")}`)
    .join("\n\n");
}

export function changelogMarkdown(repo: string) {
  const body = RELEASES.map((r) => `## ${r.version} — ${r.date}\n\n${releaseMarkdown(r)}`).join("\n\n");
  return `# Changelog\n\nAll notable changes to TrackerLookup. Downloads are on the [releases page](${repo}/releases).\n\n${body}\n`;
}

export { RELEASES };
