import { readFile, writeFile, rename } from "node:fs/promises";
import { cacheSteamIcons } from "./steam-icons.mjs";

const file = "content/steam-history.json";
const history = JSON.parse(await readFile(file, "utf8"));
history.games = await cacheSteamIcons(history.games);
await writeFile(`${file}.tmp`, JSON.stringify(history, null, 2) + "\n", "utf8");
await rename(`${file}.tmp`, file);
