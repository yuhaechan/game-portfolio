import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { enrichGenres } from "./steam-genres.mjs";
import { cacheSteamIcons } from "./steam-icons.mjs";

export function selectedAppIds(value) {
  if (!Array.isArray(value) || value.length > 500 || value.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error("표시할 게임은 최대 500개의 Steam App ID로 지정하세요.");
  }
  return [...new Set(value)];
}

export function createHistory(payload, appIds, updatedAt = new Date().toISOString()) {
  const games = payload?.response?.games;
  if (!Array.isArray(games)) throw new Error("게임 목록을 읽지 못했습니다. Steam 게임 세부 정보와 플레이시간 공개 설정을 확인하세요.");
  const byId = new Map(games.map(game => [game.appid, game]));
  return {
    updatedAt,
    games: selectedAppIds(appIds).map(appId => {
      const game = byId.get(appId);
      if (!game || typeof game.name !== "string" || !game.name.trim() || !Number.isSafeInteger(game.playtime_forever) || game.playtime_forever < 0) {
        throw new Error(`선택한 게임 ${appId}의 이름 또는 플레이시간을 확인할 수 없습니다. 기존 기록을 유지합니다.`);
      }
      return { appId, name: game.name.trim(), playtimeMinutes: game.playtime_forever,
        ...(/^[a-f0-9]{40}$/i.test(game.img_icon_url ?? "") ? { iconHash: game.img_icon_url } : {}) };
    }),
  };
}

async function atomicJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  await writeFile(temp, JSON.stringify(value, null, 2) + "\n", "utf8");
  await rename(temp, file);
}

export async function syncSteam({ catalog = false, fetcher = fetch } = {}) {
  const appIds = selectedAppIds(JSON.parse(await readFile("content/steam-selection.json", "utf8")).appIds);
  if (!catalog && !appIds.length) {
    console.log("표시할 Steam 게임을 선택한 후 동기화하세요. 기존 기록을 유지합니다.");
    return;
  }
  const key = process.env.STEAM_WEB_API_KEY?.trim();
  const steamId = process.env.STEAM_ID?.trim();
  if (!key || !/^[0-9]{17}$/.test(steamId ?? "")) throw new Error("비공개 환경변수 STEAM_WEB_API_KEY와 17자리 STEAM_ID를 설정하세요.");
  const url = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/");
  url.search = new URLSearchParams({ key, steamid: steamId, include_appinfo: "1", include_played_free_games: "1" }).toString();
  let response;
  try { response = await fetcher(url, { signal: AbortSignal.timeout(20000), redirect: "error" }); }
  catch { throw new Error("Steam에 연결하지 못했습니다. 기존 기록을 유지합니다."); }
  if (!response.ok) throw new Error(`Steam 요청 실패 (${response.status}). API 키와 공개 설정을 확인하세요.`);
  let payload;
  try { payload = await response.json(); } catch { throw new Error("Steam 응답 형식이 올바르지 않습니다. 기존 기록을 유지합니다."); }
  if (catalog) {
    const ids = payload?.response?.games?.map(game => game.appid);
    if (!Array.isArray(ids)) throw new Error("게임 목록이 비공개이거나 조회할 수 없습니다.");
    // Full selection catalog remains local; only chosen games go into public history.
    const games = payload.response.games.map(game => createHistory({ response: { games: [game] } }, [game.appid]).games[0]);
    await atomicJson(".local/steam-library.json", { updatedAt: new Date().toISOString(), games });
    console.log("게임 목록을 .local/steam-library.json에 저장했습니다. 공개할 App ID만 content/steam-selection.json에 지정하세요.");
  } else {
    const history = createHistory(payload, appIds);
    history.games = await enrichGenres(history.games, { fetcher });
    history.games = await cacheSteamIcons(history.games, { fetcher });
    await atomicJson("content/steam-history.json", history);
    console.log(`선택한 ${history.games.length}개 게임의 플레이시간을 갱신했습니다.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  syncSteam({ catalog: process.argv.includes("--catalog") }).catch(error => {
    // Never log a request URL or raw fetch error: they may include the API key.
    console.error(error.message);
    process.exitCode = 1;
  });
}
