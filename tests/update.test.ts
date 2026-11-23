import "./stub";
import { test } from "node:test";
import assert from "node:assert/strict";
import { newer, remoteVersion } from "../src/update";
import { changesSince, RELEASES, VERSION } from "../src/changelog";
import { EN } from "../src/release-notes";

test("version comparison", () => {
  assert.equal(newer("4.1.0", "4.0.9"), true);
  assert.equal(newer("4.10.0", "4.9.0"), true);
  assert.equal(newer("4.1", "4.1.0"), false);
  assert.equal(newer("4.0.0", "4.0.0"), false);
  assert.equal(newer("3.9.9", "4.0.0"), false);
});

test("version from the file header", () => {
  assert.equal(remoteVersion("/**\n * @name TrackerLookup\n * @version 4.2.1\n */"), "4.2.1");
  assert.equal(remoteVersion("<html>404</html>"), null);
});

test("changelog includes only releases after the previous version", () => {
  assert.equal(RELEASES[0].version, VERSION);
  const fromPrev = changesSince(RELEASES[1]?.version ?? "0.0.0");
  const items = fromPrev.flatMap((c) => c.items);
  assert.ok(items.length > 0);
  assert.ok(
    items.every((i) => [...(RELEASES[0].ru.added ?? []), ...(RELEASES[0].ru.improved ?? []), ...(RELEASES[0].ru.fixed ?? [])].includes(i)),
  );
  assert.deepEqual(changesSince(VERSION), []);
});

test("every release has notes in both languages and a valid date", () => {
  for (const r of RELEASES) {
    assert.match(r.version, /^\d+\.\d+\.\d+$/);
    assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Object.values(r.ru).flat().length > 0, r.version);
    assert.ok(Object.values(EN[r.version] ?? {}).flat().length > 0, r.version);
  }
  const versions = RELEASES.map((r) => r.version);
  assert.deepEqual(
    [...versions].sort((a, b) => (newer(a, b) ? -1 : 1)),
    versions,
  );
});
