"use client";

import { useMemo, useState } from "react";

type Result = "Win" | "Loss" | "Draw";
type Analysis = "Not analysed" | "Analysed";

type Game = {
  id: number;
  date: string;
  white: string;
  whiteRating: number;
  black: string;
  blackRating: number;
  result: Result;
  you: "White" | "Black";
  provider: "Chess.com" | "Lichess";
  speed: "Rapid" | "Blitz";
  control: string;
  eco: string;
  opening: string;
  analysis: Analysis;
  whiteAccuracy?: number;
  blackAccuracy?: number;
  indexed: boolean;
};

const games: Game[] = [
  {
    id: 1,
    date: "28.07.26",
    white: "dmitrigrecov",
    whiteRating: 1635,
    black: "ExMo10",
    blackRating: 1636,
    result: "Win",
    you: "White",
    provider: "Chess.com",
    speed: "Rapid",
    control: "10+0",
    eco: "E90",
    opening: "King's Indian Defense",
    analysis: "Not analysed",
    indexed: false,
  },
  {
    id: 2,
    date: "28.07.26",
    white: "ChessGlasses2",
    whiteRating: 1661,
    black: "dmitrigrecov",
    blackRating: 1626,
    result: "Loss",
    you: "Black",
    provider: "Chess.com",
    speed: "Rapid",
    control: "10+0",
    eco: "D35",
    opening: "Queen's Gambit Declined",
    analysis: "Not analysed",
    indexed: false,
  },
  {
    id: 3,
    date: "28.07.26",
    white: "Cvijan",
    whiteRating: 2177,
    black: "vokerg",
    blackRating: 2056,
    result: "Loss",
    you: "Black",
    provider: "Lichess",
    speed: "Rapid",
    control: "10+0",
    eco: "D01",
    opening: "Rapport–Jobava System",
    analysis: "Not analysed",
    indexed: false,
  },
  {
    id: 4,
    date: "28.07.26",
    white: "dmitrigrecov",
    whiteRating: 1574,
    black: "IvanDzhadzhikov08",
    blackRating: 1540,
    result: "Win",
    you: "White",
    provider: "Chess.com",
    speed: "Blitz",
    control: "5+0",
    eco: "D53",
    opening: "Queen's Gambit Declined",
    analysis: "Not analysed",
    indexed: false,
  },
  {
    id: 5,
    date: "28.07.26",
    white: "vokerg",
    whiteRating: 1806,
    black: "toha1",
    blackRating: 1794,
    result: "Loss",
    you: "White",
    provider: "Lichess",
    speed: "Blitz",
    control: "5+3",
    eco: "A40",
    opening: "English Defense",
    analysis: "Not analysed",
    indexed: false,
  },
  {
    id: 6,
    date: "28.07.26",
    white: "notorious_chess_looser",
    whiteRating: 1398,
    black: "LULUDD",
    blackRating: 1375,
    result: "Win",
    you: "White",
    provider: "Chess.com",
    speed: "Rapid",
    control: "10+0",
    eco: "D11",
    opening: "Slav Defense",
    analysis: "Not analysed",
    indexed: false,
  },
  {
    id: 7,
    date: "25.07.26",
    white: "reservervok",
    whiteRating: 1563,
    black: "valeriu_stan",
    blackRating: 1542,
    result: "Win",
    you: "White",
    provider: "Chess.com",
    speed: "Rapid",
    control: "10+0",
    eco: "D10",
    opening: "Slav Defense",
    analysis: "Analysed",
    whiteAccuracy: 94,
    blackAccuracy: 91,
    indexed: true,
  },
  {
    id: 8,
    date: "25.07.26",
    white: "ANKonovalov",
    whiteRating: 1549,
    black: "dmitrigrecov",
    blackRating: 1565,
    result: "Win",
    you: "Black",
    provider: "Chess.com",
    speed: "Blitz",
    control: "5+0",
    eco: "B30",
    opening: "Sicilian Defense: Old Sicilian",
    analysis: "Analysed",
    whiteAccuracy: 92,
    blackAccuracy: 96,
    indexed: true,
  },
];

const navItems = [
  ["⌂", "Home"],
  ["▦", "Study"],
  ["▤", "Courses"],
  ["▦", "Games"],
  ["♜", "Openings"],
  ["↗", "Progress"],
];

const board = [
  ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"],
  ["♟", "♟", "♟", "", "♟", "♟", "♟", "♟"],
  ["", "", "", "", "", "", "", ""],
  ["", "", "", "♟", "", "", "", ""],
  ["", "", "", "♙", "", "", "", ""],
  ["", "", "♘", "", "", "♘", "", ""],
  ["♙", "♙", "♙", "", "♙", "♙", "♙", "♙"],
  ["♖", "", "♗", "♕", "♔", "♗", "", "♖"],
];

function ResultPill({ result }: { result: Result }) {
  return <span className={`result result-${result.toLowerCase()}`}>{result}</span>;
}

function ChessBoard() {
  return (
    <div className="chessboard" aria-label="Position preview">
      {board.flatMap((row, rowIndex) =>
        row.map((piece, columnIndex) => (
          <div
            className={`square ${(rowIndex + columnIndex) % 2 ? "dark" : "light"}`}
            key={`${rowIndex}-${columnIndex}`}
          >
            {piece}
          </div>
        )),
      )}
    </div>
  );
}

export default function Home() {
  const [selectedId, setSelectedId] = useState(3);
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("All");
  const [result, setResult] = useState("All");
  const [moreFilters, setMoreFilters] = useState(false);
  const [jobsOpen, setJobsOpen] = useState(false);
  const [rowMenu, setRowMenu] = useState<number | null>(null);
  const [analysisById, setAnalysisById] = useState<Record<number, Analysis>>({});
  const [indexedById, setIndexedById] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState("");

  const filteredGames = useMemo(() => {
    const needle = query.toLowerCase().trim();
    return games.filter((game) => {
      const matchesQuery =
        !needle ||
        `${game.white} ${game.black} ${game.opening} ${game.eco}`
          .toLowerCase()
          .includes(needle);
      const matchesProvider = provider === "All" || game.provider === provider;
      const matchesResult = result === "All" || game.result === result;
      return matchesQuery && matchesProvider && matchesResult;
    });
  }, [provider, query, result]);

  const selected =
    games.find((game) => game.id === selectedId) ?? filteredGames[0] ?? games[0];
  const selectedAnalysis = analysisById[selected.id] ?? selected.analysis;
  const selectedIndexed = indexedById[selected.id] ?? selected.indexed;

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function analyse() {
    setAnalysisById((current) => ({ ...current, [selected.id]: "Analysed" }));
    showToast("Analysis complete — accuracy is ready.");
  }

  function indexGame() {
    setIndexedById((current) => ({ ...current, [selected.id]: true }));
    showToast("Game indexed into your repertoire.");
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">♞</span>
          <span>
            <strong>Chess Repertoire</strong>
            <small>TRAINER</small>
          </span>
        </div>

        <nav aria-label="Primary navigation">
          {navItems.map(([icon, label]) => (
            <button className={label === "Games" ? "nav-item active" : "nav-item"} key={label}>
              <span className="nav-icon">{icon}</span>
              <span>{label}</span>
              {["Study", "Openings", "Progress"].includes(label) && (
                <span className="chevron">⌄</span>
              )}
            </button>
          ))}
        </nav>

        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label="Workspace navigation">
          <button className="nav-item">
            <span className="nav-icon">⌕</span>
            <span>Tools</span>
            <span className="chevron">⌄</span>
          </button>
          <button className="nav-item">
            <span className="nav-icon">⚙</span>
            <span>Settings</span>
            <span className="chevron">⌄</span>
          </button>
        </nav>

        <div className="user-card">
          <span className="avatar">DG</span>
          <span>
            <strong>Local user</strong>
            <small>Account and sign out</small>
          </span>
          <span>›</span>
        </div>
      </aside>

      <section className="workspace">
        <header className="page-header">
          <div>
            <p className="eyebrow">STUDY LIBRARY</p>
            <h1>Games</h1>
            <p>Find a game, then turn it into repertoire insight.</p>
          </div>
          <div className="header-actions">
            <div className="summary" aria-label="Game processing summary">
              <span><strong>50</strong><small>GAMES</small></span>
              <span><strong>34</strong><small>ANALYSED</small></span>
              <span><strong>34</strong><small>INDEXED</small></span>
            </div>
            <div className="jobs-wrap">
              <button
                className={jobsOpen ? "button secondary active-control" : "button secondary"}
                onClick={() => setJobsOpen((open) => !open)}
              >
                <span className="button-icon">◌</span> Processing
                <span className="job-dot">3</span>
              </button>
              {jobsOpen && (
                <div className="jobs-popover">
                  <div className="popover-heading">
                    <div>
                      <strong>Processing center</strong>
                      <small>3 jobs need attention</small>
                    </div>
                    <button aria-label="Close processing center" onClick={() => setJobsOpen(false)}>×</button>
                  </div>
                  {[
                    ["Index games", "16 remaining", 68],
                    ["Analyse games", "16 remaining", 68],
                    ["Refresh tags", "50 ready", 100],
                  ].map(([label, meta, value]) => (
                    <div className="job" key={label}>
                      <div><strong>{label}</strong><small>{meta}</small></div>
                      <span>{value}%</span>
                      <div className="progress"><i style={{ width: `${value}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        <section className="filter-bar" aria-label="Game filters">
          <label className="search-control">
            <span>⌕</span>
            <input
              aria-label="Search games"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search player, opening or ECO…"
              value={query}
            />
            <kbd>/</kbd>
          </label>
          <label>
            <span>Account</span>
            <select defaultValue="All accounts">
              <option>All accounts</option>
              <option>dmitrigrecov</option>
              <option>vokerg</option>
            </select>
          </label>
          <label>
            <span>Provider</span>
            <select value={provider} onChange={(event) => setProvider(event.target.value)}>
              <option value="All">All providers</option>
              <option>Chess.com</option>
              <option>Lichess</option>
            </select>
          </label>
          <label>
            <span>Result</span>
            <select value={result} onChange={(event) => setResult(event.target.value)}>
              <option value="All">Any result</option>
              <option>Win</option>
              <option>Loss</option>
              <option>Draw</option>
            </select>
          </label>
          <label className="period-control">
            <span>Period</span>
            <select defaultValue="3M">
              <option>3M</option>
              <option>1M</option>
              <option>1Y</option>
              <option>All time</option>
            </select>
          </label>
          <button
            className={moreFilters ? "button filter-button active-control" : "button filter-button"}
            onClick={() => setMoreFilters(true)}
          >
            <span className="button-icon">☷</span> More filters
          </button>
        </section>

        <div className="content-grid">
          <section className="games-panel">
            <div className="panel-heading">
              <div>
                <h2>Imported games</h2>
                <p>{filteredGames.length} visible · sorted newest first</p>
              </div>
              {(query || provider !== "All" || result !== "All") && (
                <button
                  className="text-button"
                  onClick={() => {
                    setQuery("");
                    setProvider("All");
                    setResult("All");
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date ↓</th>
                    <th>Players</th>
                    <th>Result</th>
                    <th>You</th>
                    <th>Provider</th>
                    <th>Control</th>
                    <th>Opening</th>
                    <th>Analysis</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGames.map((game) => {
                    const analysis = analysisById[game.id] ?? game.analysis;
                    return (
                      <tr
                        aria-selected={selected.id === game.id}
                        className={selected.id === game.id ? "selected" : ""}
                        key={game.id}
                        onClick={() => {
                          setSelectedId(game.id);
                          setRowMenu(null);
                        }}
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedId(game.id);
                          }
                        }}
                      >
                        <td data-label="Date">{game.date}</td>
                        <td data-label="Players" className="players">
                          <strong>{game.white} <em>({game.whiteRating})</em></strong>
                          <span>vs {game.black} <em>({game.blackRating})</em></span>
                        </td>
                        <td data-label="Result"><ResultPill result={game.result} /></td>
                        <td data-label="You" className="muted">{game.you}</td>
                        <td data-label="Provider">
                          <span className={`provider provider-${game.provider.toLowerCase().replace(".", "")}`}>
                            {game.provider}
                          </span>
                        </td>
                        <td data-label="Control">
                          <strong>{game.speed}</strong>
                          <span className="cell-sub">{game.control}</span>
                        </td>
                        <td data-label="Opening">
                          <strong>{game.eco}</strong>
                          <span className="cell-sub opening-name">{game.opening}</span>
                        </td>
                        <td data-label="Analysis">
                          <span className={`status-icon ${analysis === "Analysed" ? "ready" : ""}`}>
                            {analysis === "Analysed" ? "✓" : "−"}
                          </span>
                          <span className="analysis-copy">
                            {analysis}
                            <small>{(indexedById[game.id] ?? game.indexed) ? "Indexed" : "Not indexed"}</small>
                          </span>
                        </td>
                        <td className="row-action">
                          <button
                            aria-label={`Actions for ${game.white} versus ${game.black}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setRowMenu(rowMenu === game.id ? null : game.id);
                            }}
                          >
                            •••
                          </button>
                          {rowMenu === game.id && (
                            <div className="row-menu">
                              <button onClick={() => { setSelectedId(game.id); analyse(); }}>Analyse</button>
                              <button onClick={() => { setSelectedId(game.id); indexGame(); }}>Index plies</button>
                              <button onClick={() => showToast(`Opening ${game.provider}…`)}>Open on {game.provider}</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!filteredGames.length && (
                <div className="empty-state">
                  <span>♙</span>
                  <h3>No games match those filters</h3>
                  <p>Try another player, opening, provider, or result.</p>
                </div>
              )}
            </div>
          </section>

          <aside className="detail-panel" aria-live="polite">
            <div className="detail-topline">
              <div>
                <p className="eyebrow">SELECTED GAME</p>
                <h2>
                  {selected.white} <span>vs</span> {selected.black}
                </h2>
              </div>
              <button className="icon-button" aria-label="Selected game actions">•••</button>
            </div>

            <div className="game-summary">
              <div className="game-facts">
                <div className="outcome"><ResultPill result={selected.result} /><span>· You played {selected.you}</span></div>
                <dl>
                  <div><dt>□</dt><dd>28 Jul 2026</dd></div>
                  <div><dt>◎</dt><dd>{selected.provider}</dd></div>
                  <div><dt>◷</dt><dd>{selected.speed} · {selected.control}</dd></div>
                  <div><dt>♜</dt><dd>Rated</dd></div>
                  <div><dt>▣</dt><dd>{selected.eco} · {selected.opening}</dd></div>
                  <div>
                    <dt>{selectedAnalysis === "Analysed" ? "✓" : "−"}</dt>
                    <dd>{selectedAnalysis}</dd>
                  </div>
                </dl>
              </div>
              <ChessBoard />
            </div>

            <section className="accuracy-card">
              <div className="section-label">ACCURACY</div>
              <div className="accuracy-grid">
                <article>
                  <div><i className="white-disc" /><strong>WHITE</strong></div>
                  <b>{selectedAnalysis === "Analysed" ? `${selected.whiteAccuracy ?? 91}%` : "—"}</b>
                  <small>{selectedAnalysis === "Analysed" ? selected.white : "Not analysed"}</small>
                </article>
                <article>
                  <div><i className="black-disc" /><strong>BLACK {selected.you === "Black" ? "(YOU)" : ""}</strong></div>
                  <b>{selectedAnalysis === "Analysed" ? `${selected.blackAccuracy ?? 93}%` : "—"}</b>
                  <small>{selectedAnalysis === "Analysed" ? selected.black : "Not analysed"}</small>
                </article>
              </div>
            </section>

            <button className="button primary wide" onClick={analyse}>
              <span className="button-icon">⌁</span>
              {selectedAnalysis === "Analysed" ? "Re-analyse game" : "Analyse game"}
            </button>
            <div className="secondary-actions">
              <button className="button secondary" onClick={indexGame}>
                <span className="button-icon">☷</span>
                {selectedIndexed ? "Indexed" : "Index plies"}
              </button>
              <button className="button secondary" onClick={() => showToast(`Opening ${selected.provider}…`)}>
                <span className="button-icon">↗</span> Open on {selected.provider}
              </button>
            </div>
          </aside>
        </div>
      </section>

      {moreFilters && (
        <div className="drawer-layer" role="dialog" aria-modal="true" aria-labelledby="filter-title">
          <button className="drawer-backdrop" aria-label="Close advanced filters" onClick={() => setMoreFilters(false)} />
          <aside className="filter-drawer">
            <div className="drawer-heading">
              <div>
                <p className="eyebrow">REFINE YOUR LIBRARY</p>
                <h2 id="filter-title">More filters</h2>
              </div>
              <button className="icon-button" onClick={() => setMoreFilters(false)} aria-label="Close">×</button>
            </div>
            <div className="drawer-section">
              <h3>Game details</h3>
              <div className="drawer-grid">
                <label><span>Colour</span><select><option>White or Black</option><option>White</option><option>Black</option></select></label>
                <label><span>Rated</span><select><option>Rated or casual</option><option>Rated</option><option>Casual</option></select></label>
                <label><span>Analysis</span><select><option>Any status</option><option>Analysed</option><option>Not analysed</option></select></label>
                <label><span>Indexed</span><select><option>Any status</option><option>Indexed</option><option>Not indexed</option></select></label>
              </div>
            </div>
            <div className="drawer-section">
              <h3>Player and opening</h3>
              <label><span>Opponent</span><input placeholder="Username" /></label>
              <label><span>Opening</span><input placeholder="Sicilian, London, D01…" /></label>
              <div className="drawer-grid">
                <label><span>Minimum rating</span><input inputMode="numeric" placeholder="1200" /></label>
                <label><span>Maximum rating</span><input inputMode="numeric" placeholder="2200" /></label>
              </div>
            </div>
            <div className="drawer-section">
              <h3>Accuracy</h3>
              <div className="range-row"><span>0%</span><input type="range" min="0" max="100" defaultValue="0" /><span>100%</span></div>
            </div>
            <div className="drawer-footer">
              <button className="button secondary" onClick={() => showToast("Advanced filters reset.")}>Reset</button>
              <button className="button primary" onClick={() => { setMoreFilters(false); showToast("Advanced filters applied."); }}>Show {filteredGames.length} games</button>
            </div>
          </aside>
        </div>
      )}

      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}
