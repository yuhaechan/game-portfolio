import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cacheSteamIcons } from "./steam-icons.mjs";

test("bad CDN responses fall back; valid cached icons need no network", async () => {
  const directory = await mkdtemp(join(tmpdir(), "steam-icons-"));
  const original = process.cwd();
  process.chdir(directory);
  try {
    const game = { appId: 10, iconHash: "a".repeat(40), name: "Example" };
    const bytes = new Uint8Array(64);
    bytes.set([0xff, 0xd8, 0xff]);
    let requests = 0;
    const [cached] = await cacheSteamIcons([game], { fetcher: async () => {
      requests++;
      return requests === 1 ? new Response("not an image", { status: 404 })
        : new Response(bytes, { headers: { "content-type": "image/jpeg" } });
    } });
    assert.equal(requests, 2);
    assert.deepEqual(new Uint8Array(await readFile(`public${cached.iconPath}`)), bytes);
    await cacheSteamIcons([cached], { fetcher: () => { throw new Error("network must not be used"); } });
    const [failed] = await cacheSteamIcons([{ ...game, appId: 20, iconPath: "/stale.jpg" }], {
      fetcher: async () => new Response("HTML error", { headers: { "content-type": "image/jpeg" } }),
    });
    assert.equal(failed.iconPath, undefined);
    assert.equal(failed.name, game.name);
  } finally {
    process.chdir(original);
    await rm(directory, { recursive: true, force: true });
  }
});
