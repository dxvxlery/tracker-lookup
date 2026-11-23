import "./stub";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseSession,
  parseVoice,
  voiceHidden,
  appendUnique,
  messageBody,
  attachmentInfo,
  eventTone,
  eventFlags,
  nickSource,
  dayKey,
} from "../src/parse";

test("session from raw value, cookie or cURL", () => {
  assert.equal(parseSession("  AbCdEfGh12345678_-xyz  "), "AbCdEfGh12345678_-xyz");
  assert.equal(parseSession("tracker_session=Zz99Zz99Zz99Zz99Zz99; other=1"), "Zz99Zz99Zz99Zz99Zz99");
  assert.equal(
    parseSession(`curl 'https://example.test/api' -b 'tracker_session=Qq11Qq11Qq11Qq11Qq11' -H 'accept: x'`),
    "Qq11Qq11Qq11Qq11Qq11",
  );
  assert.equal(parseSession("short"), null);
  assert.equal(parseSession(""), null);
});

test("voice now: current, left and missing", () => {
  const live = parseVoice({
    voice: {
      state: "current",
      guildId: "10",
      guildName: "Test Guild",
      guildIconHash: "a_ff",
      channelId: "20",
      channelName: "general",
      startedAt: "2026-01-01T10:00:00Z",
      leftAt: null,
    },
    visibility: { voice: "visible" },
  });
  assert.equal(live?.live, true);
  assert.equal(live?.icon, "https://cdn.discordapp.com/icons/10/a_ff.gif?size=64");
  assert.equal(live?.startedAt?.toISOString(), "2026-01-01T10:00:00.000Z");
  const gone = parseVoice({ voice: { state: "last", guildId: "10", channelId: "20", leftAt: "2026-01-01T11:00:00Z" } });
  assert.equal(gone?.live, false);
  assert.equal(parseVoice({ voice: null }), null);
  assert.equal(parseVoice({}), null);
  assert.equal(voiceHidden({ visibility: { voice: "hidden" } }), true);
  assert.equal(voiceHidden({ visibility: { voice: "visible" } }), false);
});

test("cursor pages are merged without duplicates", () => {
  const a = [{ id: "1" }, { id: "2" }];
  const b = [{ id: "2" }, { id: "3" }, { id: "3" }];
  assert.deepEqual(
    appendUnique(a, b, (x) => x.id).map((x) => x.id),
    ["1", "2", "3"],
  );
});

test("message bodies", () => {
  assert.deepEqual(messageBody({ content: "hi" }), { before: null, after: "hi", hidden: null });
  assert.deepEqual(messageBody({ beforeContent: "old", afterContent: "new" }), { before: "old", after: "new", hidden: null });
  assert.deepEqual(messageBody({ beforeContent: "same", afterContent: "same" }), { before: null, after: "same", hidden: null });
  assert.equal(messageBody({ content: null, contentLength: 12 }).hidden, "текст не сохранён · 12 симв.");
  assert.equal(messageBody({ content: null }).hidden, null);
  assert.deepEqual(attachmentInfo({ attachmentCount: 2, attachments: [{ contentUrl: "/a/1" }, { contentUrl: null }] }), {
    count: 2,
    urls: ["/a/1"],
  });
  assert.deepEqual(attachmentInfo({}), { count: 0, urls: [] });
});

test("events and nicknames", () => {
  assert.equal(eventTone("stream_on"), "is-join");
  assert.equal(eventTone("leave"), "is-leave");
  assert.equal(eventTone("state_sync"), "");
  assert.deepEqual(eventFlags({ isSelfMuted: true, isStreaming: true }), ["🎙️ выкл", "📺 стрим"]);
  assert.equal(nickSource("current_gateway_guild_name"), "ник на сервере");
  assert.equal(nickSource("global_profile_snapshot"), "профиль");
  assert.equal(nickSource("something_guild_x"), "ник на сервере");
  assert.equal(dayKey("bad"), "");
  assert.equal(dayKey("2026-03-05T12:00:00Z"), dayKey("2026-03-05T12:30:00Z"));
});
