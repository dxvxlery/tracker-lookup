import { disk, calls, setResponses } from "./stub";
import { test } from "node:test";
import assert from "node:assert/strict";
import { apiGet, explain } from "../src/net";
import { cachedGet, clearCache, cacheSize } from "../src/cache";
import { api } from "../src/api";

test("no cookie without session, cookie with session", async () => {
  disk.TrackerLookup = { settings: { session: "" } };
  setResponses([{ status: 200, body: { items: [] } }]);
  await apiGet("/api/comments?x=1", "/profile/1");
  assert.equal(calls.at(-1)?.headers.cookie, undefined);
  assert.equal(calls.at(-1)?.headers.referer, "https://discord-tracker.com/profile/1");
  disk.TrackerLookup = { settings: { session: " Ss00Ss00Ss00Ss00 " } };
  setResponses([{ status: 200, body: {} }]);
  await apiGet("/api/users/1", "/profile/1");
  assert.equal(calls.at(-1)?.headers.cookie, "tracker_session=Ss00Ss00Ss00Ss00");
});

test("401 explains what to do", async () => {
  disk.TrackerLookup = { settings: { session: "" } };
  setResponses([{ status: 401, body: { code: "unauthenticated", message: "Authentication required" } }]);
  await assert.rejects(apiGet("/api/users/1", "/profile/1"), (e: any) => e.status === 401 && /tracker_session/.test(e.message));
  assert.match(explain(401, "", true), /протухла/);
  assert.match(explain(500, '{"message":"boom"}', true), /boom/);
});

test("cache serves repeat requests and can be bypassed", async () => {
  disk.TrackerLookup = { settings: { session: "", cacheMinutes: 5 } };
  clearCache();
  const before = calls.length;
  setResponses([
    { status: 200, body: { n: 1 } },
    { status: 200, body: { n: 2 } },
  ]);
  const a = await cachedGet("/api/x", "/");
  const b = await cachedGet("/api/x", "/");
  assert.equal(b.fromCache, true);
  assert.deepEqual(b.data, a.data);
  const c = await cachedGet("/api/x", "/", true);
  assert.deepEqual(c.data, { n: 2 });
  assert.equal(calls.length - before, 2);
  assert.equal(cacheSize(), 1);
});

test("urls carry sort, order and cursor", async () => {
  disk.TrackerLookup = { settings: { session: "", cacheMinutes: 0 } };
  await api.summary("7", "friends", "first", "desc", "c:[1,2]");
  assert.equal(
    calls.at(-1)?.url,
    "https://discord-tracker.com/api/users/7/activity-summary?kind=friends&sort=first&order=desc&limit=100&cursor=c%3A%5B1%2C2%5D",
  );
  await api.timeline("7", "asc", "activity", null);
  assert.equal(calls.at(-1)?.url, "https://discord-tracker.com/api/users/7/voice-timeline?limit=100&order=asc&category=activity");
  await api.timeline("7", "desc", "", null);
  assert.equal(calls.at(-1)?.url, "https://discord-tracker.com/api/users/7/voice-timeline?limit=100&order=desc");
  await api.messages("7", "mention", null);
  assert.equal(calls.at(-1)?.url, "https://discord-tracker.com/api/users/7/message-events?limit=30&eventType=mention");
  await api.comments("7", null);
  assert.equal(calls.at(-1)?.url, "https://discord-tracker.com/api/comments?targetType=user&targetId=7&rootOnly=true&limit=15");
});
