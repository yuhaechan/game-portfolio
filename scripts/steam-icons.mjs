import { mkdir, readFile, writeFile, rename } from "node:fs/promises";

export function isIcon(bytes) {
  return bytes.length > 32 && bytes.length <= 1024 * 1024 && (
    (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47));
}

export async function cacheSteamIcons(games, { fetcher = fetch } = {}) {
  await mkdir("public/steam-icons", { recursive: true });
  const result = new Array(games.length);
  let next = 0;
  async function worker() {
    while (next < games.length) {
      const index = next++;
      const game = games[index];
      const iconPath = `/steam-icons/${game.appId}-${game.iconHash}.jpg`;
      const destination = `public${iconPath}`;
      let saved = false;
      if (/^[a-f0-9]{40}$/i.test(game.iconHash ?? "")) {
        try { saved = isIcon(await readFile(destination)); } catch { /* first download */ }
        if (!saved) {
          for (const origin of ["https://cdn.fastly.steamstatic.com", "https://media.steampowered.com"]) {
            try {
              const response = await fetcher(`${origin}/steamcommunity/public/images/apps/${game.appId}/${game.iconHash}.jpg`, { signal: AbortSignal.timeout(10000) });
              if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) continue;
              const bytes = new Uint8Array(await response.arrayBuffer());
              if (!isIcon(bytes)) continue;
              await writeFile(`${destination}.tmp`, bytes);
              await rename(`${destination}.tmp`, destination);
              saved = true;
              break;
            } catch { /* alternate CDN or placeholder */ }
          }
        }
      }
      const { iconPath: previousIconPath, ...metadata } = game;
      result[index] = { ...metadata, ...(saved ? { iconPath } : {}) };
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);
  console.log(`아이콘 저장 ${result.filter(game => game.iconPath).length}/${games.length}`);
  return result;
}
