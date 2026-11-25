import test from "node:test";
import assert from "node:assert/strict";
import { createHistory, selectedAppIds } from "./sync-steam.mjs";

test("only selected games are exported, in selected order, with original minutes", () => {
  const result = createHistory({ response: { games: [
    { appid: 10, name: "Game A", playtime_forever: 125 },
    { appid: 20, name: "Unselected game", playtime_forever: 999 },
    { appid: 30, name: "Game B", playtime_forever: 0 },
  ] } }, [30, 10, 30], "2026-11-25T00:00:00.000Z");
  assert.deepEqual(result.games, [
    { appId: 30, name: "Game B", playtimeMinutes: 0 },
    { appId: 10, name: "Game A", playtimeMinutes: 125 },
  ]);
});

test("private or incomplete library fails instead of replacing saved times with zero", () => {
  assert.throws(() => createHistory({ response: {} }, [10]));
  assert.throws(() => createHistory({ response: { games: [] } }, [10]));
  assert.throws(() => createHistory({ response: { games: [{ appid: 10, name: "A", playtime_forever: -1 }] } }, [10]));
});

test("invalid or excessive app selections are rejected", () => {
  for (const ids of [["10"], [0], [-1], Array.from({ length: 501 }, (_, i) => i + 1)]) assert.throws(() => selectedAppIds(ids));
});
