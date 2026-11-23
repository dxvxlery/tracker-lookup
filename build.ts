import { build, transform, type Plugin } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, statSync, readdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { RELEASES, releaseMarkdown, changelogMarkdown } from "./src/release-notes.ts";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const REPO = "https://github.com/dxvxlery/tracker-lookup";

if (RELEASES[0].version !== pkg.version) {
  console.error(`package.json version ${pkg.version} has no entry at the top of src/releases.ts (latest: ${RELEASES[0].version})`);
  process.exit(1);
}

const define = { __VERSION__: JSON.stringify(pkg.version), __UPDATE_URL__: JSON.stringify(pkg.updateUrl || "") };

const css: Plugin = {
  name: "css-text",
  setup(b) {
    b.onLoad({ filter: /\.css$/ }, async (a) => {
      const { code } = await transform(readFileSync(a.path, "utf8"), { loader: "css", minify: true });
      return { contents: `export default ${JSON.stringify(code.trim())}`, loader: "js" };
    });
  },
};

async function plugin() {
  const out = "dist/TrackerLookup.plugin.js";
  mkdirSync("dist", { recursive: true });
  const result = await build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    format: "iife",
    globalName: "TL",
    footer: { js: "module.exports=TL.default;" },
    platform: "browser",
    target: "chrome120",
    minify: true,
    legalComments: "none",
    charset: "utf8",
    write: false,
    external: ["fs", "path"],
    define,
    plugins: [css],
  });
  const banner = `/**\n * @name TrackerLookup\n * @description ${pkg.description}\n * @version ${pkg.version}\n * @author dxvxlery\n * @source ${REPO}\n * @website ${REPO}${pkg.updateUrl ? `\n * @updateUrl ${pkg.updateUrl}` : ""}\n */\n`;
  writeFileSync(out, banner + result.outputFiles[0].text);
  const kb = statSync(out).size / 1024;
  console.log(`${out}: ${kb.toFixed(1)} KB`);
  syncBadges(pkg.version, Math.round(kb));
  writeIfChanged("CHANGELOG.md", changelogMarkdown(REPO));
}

function writeIfChanged(file: string, text: string) {
  let old = "";
  try {
    old = readFileSync(file, "utf8");
  } catch {}
  if (old === text) return;
  writeFileSync(file, text);
  console.log(`${file}: updated`);
}

function notes() {
  const r = RELEASES[0];
  const text = [
    "## Install",
    "",
    "1. Download **`TrackerLookup.plugin.js`** from **Assets** below.",
    "2. Put it into the BetterDiscord plugins folder: Settings → BetterDiscord → Plugins → Open Plugins Folder.",
    "3. Enable **TrackerLookup** in the list.",
    "",
    "Already installed? The plugin updates itself, nothing to do.",
    "",
    "> [!NOTE]",
    "> The **Source code** archives are added by GitHub to every release automatically. You don't need them to install the plugin.",
    "",
    `## What's new in ${r.version}`,
    "",
    releaseMarkdown(r).replace(/^### /gm, "#### "),
    "",
  ].join("\n");
  writeFileSync("release-notes.md", text);
  console.log(`release-notes.md: v${r.version}`);
}

function syncBadges(version: string, kb: number) {
  for (const file of ["README.md", "README.ru.md"]) {
    const before = readFileSync(file, "utf8");
    const after = before
      .replace(/(img\.shields\.io\/badge\/version-)[^-]+(-)/, `$1${version}$2`)
      .replace(/(img\.shields\.io\/badge\/size-)\d+_KB(-)/, `$1${kb}_KB$2`);
    if (after === before) continue;
    writeFileSync(file, after);
    console.log(`${file}: version ${version}, size ${kb} KB`);
  }
}

async function tests() {
  const dir = ".test-out";
  rmSync(dir, { recursive: true, force: true });
  const entries = readdirSync("tests")
    .filter((f) => f.endsWith(".test.ts"))
    .map((f) => "tests/" + f);
  await build({
    entryPoints: entries,
    bundle: true,
    format: "esm",
    platform: "node",
    target: "node22",
    outdir: dir,
    outExtension: { ".js": ".mjs" },
    define,
    plugins: [css],
    logLevel: "warning",
  });
  const files = readdirSync(dir).map((f) => `${dir}/${f}`);
  const r = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
  rmSync(dir, { recursive: true, force: true });
  process.exit(r.status ?? 1);
}

await (process.argv.includes("--test") ? tests() : process.argv.includes("--notes") ? notes() : plugin());
