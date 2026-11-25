"use client";

import { useEffect, useRef, useState } from "react";
import history from "../../content/steam-history.json";
import { assetUrl } from "@/lib/portfolio";

type SteamGame = { appId: number; name: string; playtimeMinutes: number; iconHash?: string; iconPath?: string; genres?: string[] };
const formatHours = (minutes: number) => new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(minutes / 60);
const PAGE_SIZE = 5;

function GameIcon({ game }: { game: SteamGame }) {
  const [attempt, setAttempt] = useState(0);
  const sources = [game.iconPath ? assetUrl(game.iconPath) : undefined,
    game.iconHash ? `https://cdn.fastly.steamstatic.com/steamcommunity/public/images/apps/${game.appId}/${game.iconHash}.jpg` : undefined].filter((source): source is string => Boolean(source));
  return <span className="steam-icon" aria-hidden="true">
    <svg className="steam-icon-fallback" viewBox="0 0 32 32" fill="none"><path d="M10 11h12c3 0 5 3 5 7l-1 5c-.5 2-3 2-4 0l-2-3h-8l-2 3c-1 2-3.5 2-4 0l-1-5c0-4 2-7 5-7Z" stroke="currentColor" strokeWidth="1.6" /><path d="M11 13v6m-3-3h6" stroke="currentColor" strokeWidth="1.6" /><circle cx="22" cy="14" r="1.2" fill="currentColor" /><circle cx="24" cy="17" r="1.2" fill="currentColor" /></svg>
    {sources[attempt] && <img key={sources[attempt]} src={sources[attempt]} width="32" height="32" loading="lazy" alt="" onError={() => setAttempt(value => value + 1)} />}
  </span>;
}

export default function SteamHistory() {
  const [genre, setGenre] = useState("");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const filter = useRef<HTMLDivElement>(null);
  const filterButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!filterOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !filter.current?.contains(event.target)) setFilterOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setFilterOpen(false); filterButton.current?.focus(); }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeOnEscape); };
  }, [filterOpen]);
  const games = (history.games as SteamGame[]).filter(game => game.playtimeMinutes > 0)
    .sort((a, b) => b.playtimeMinutes - a.playtimeMinutes || a.appId - b.appId);
  const genresOf = (game: SteamGame) => game.genres?.length ? game.genres : ["미분류"];
  const genres = [...new Set(games.flatMap(genresOf))].sort((a, b) => a.localeCompare(b, "ko"));
  const filtered = games.filter(game => !genre || genresOf(game).includes(genre));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const total = filtered.reduce((sum, game) => sum + game.playtimeMinutes, 0);
  const largest = filtered[0]?.playtimeMinutes || 1;
  return <aside className="play-history" aria-labelledby="play-history-heading">
    <div className="steam-history-header">
      <h2 id="play-history-heading" className="collection-heading">게임 플레이 이력</h2>

    </div>
    {games.length ? <>
      <div className="steam-total" aria-live="polite" aria-atomic="true">
        <span>{genre ? `${genre} 플레이시간` : "총 플레이시간"}</span>
        <p><strong>{formatHours(total)}</strong><span>시간</span></p>
        <small>Steam · {filtered.length}개 게임{genre ? " 합계" : " 기준"}</small>
      </div>
      {games.length > 0 && <div className="steam-filter-controls" ref={filter}>
        <button type="button" className="filter-trigger" ref={filterButton} aria-label={genre ? `장르 필터 · ${genre}` : "장르 필터"} title="장르 필터" aria-expanded={filterOpen} aria-controls="steam-genre-filter" data-filter-active={Boolean(genre)} onClick={() => setFilterOpen(value => !value)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16M7 12h10m-7 6h4" /></svg>
        </button>
        {genre && <button type="button" className="steam-selected-genre" aria-label={`${genre} 필터 해제`} title="필터 해제" onClick={() => { setGenre(""); setPage(1); setFilterOpen(false); filterButton.current?.focus(); }}>
          {genre}<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m5 5 6 6m0-6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>}
        <div id="steam-genre-filter" className="steam-filter-panel" role="group" aria-label="Steam 게임 장르" hidden={!filterOpen}>
          {["", ...genres].map(name => <button key={name} type="button" className="steam-genre-option" aria-pressed={genre === name} onClick={() => { setGenre(name); setPage(1); setFilterOpen(false); filterButton.current?.focus(); }}>
            {name || "전체 장르"}
          </button>)}
        </div>
      </div>}
      <ul className="steam-games">{filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(game => <li key={game.appId}>
        <a className="steam-game-title" href={`https://store.steampowered.com/app/${game.appId}/`} target="_blank" rel="noopener noreferrer">
          <GameIcon key={`${game.appId}-${game.iconHash}`} game={game} />
          <span>{game.name}</span>
        </a>
        <div className="steam-time"><span className="steam-time-track" aria-hidden="true"><span style={{ width: `${game.playtimeMinutes / largest * 100}%` }} /></span><span>{formatHours(game.playtimeMinutes)}시간</span></div>
      </li>)}</ul>
      <nav className="steam-pagination" aria-label="게임 플레이 이력 페이지">
        <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="이전 게임 페이지"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m12 5-5 5 5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
        <span role="status" aria-live="polite" aria-atomic="true">{currentPage} / {pageCount}</span>
        <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} aria-label="다음 게임 페이지"><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      </nav>
      {history.updatedAt && <p className="steam-updated">갱신 <time dateTime={history.updatedAt}>{new Date(history.updatedAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</time></p>}
    </> : <p className="play-history-empty">등록된 플레이 이력이 없습니다.</p>}
  </aside>;
}
