import { readFile } from "node:fs/promises";

export async function enrichGenres(games, { fetcher = fetch } = {}) {
  let previous = [];
  try { previous = JSON.parse(await readFile("content/steam-history.json", "utf8")).games; } catch { /* first sync */ }
  const known = new Map(previous.map(game => [game.appId, game.genres]));
  const result = new Array(games.length);
  let next = 0;
  let completed = 0;
  async function worker() {
    while (next < games.length) {
      const index = next++;
      const game = games[index];
      let genres = known.get(game.appId);
      if (!Array.isArray(genres) || !genres.length) {
        genres = [];
        try {
          const url = new URL("https://store.steampowered.com/api/appdetails");
          url.search = new URLSearchParams({ appids: String(game.appId), filters: "genres", l: "koreana", cc: "KR" }).toString();
          const response = await fetcher(url, { signal: AbortSignal.timeout(10000), redirect: "error" });
          if (response.ok) {
            const app = (await response.json())[game.appId];
            if (app?.success && Array.isArray(app.data?.genres)) {
              genres = [...new Set(app.data.genres.filter(genre => !["37", "70"].includes(genre.id))
                .map(genre => genre.description).filter(name => typeof name === "string" && name.trim()))];
            }
          }
        } catch { /* unavailable store pages remain unclassified, not guessed */ }
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      result[index] = { ...game, genres };
      if (++completed % 20 === 0) console.log(`장르 확인 ${completed}/${games.length}`);
    }
  }
  await Promise.all([worker(), worker()]);
  return result;
}
