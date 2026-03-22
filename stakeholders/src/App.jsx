import { useState, useMemo } from 'react';
import { CATS, ACTORS } from './data';
import './App.css';

const CAT_ORDER = Object.keys(CATS);
const PRECEDENT_CAT = 'Precedent instrument';
const LS_KEY = 'cchb-flagged';

function loadFlagged() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) || '[]')); }
  catch { return new Set(); }
}

function saveFlagged(set) {
  localStorage.setItem(LS_KEY, JSON.stringify([...set]));
}

function downloadFlaggedCSV(flagged) {
  const actors = ACTORS.filter(a => flagged.has(a.n));
  const rows = [
    ['name', 'category', 'role', 'tags', 'link', 'notes'],
    ...actors.map(a => [a.n, a.c, a.r, a.t.join('|'), a.link || '', ''])
  ];
  const csv = rows.map(r =>
    r.map(cell => {
      const s = String(cell);
      return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')
  ).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cchb-flagged-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function ActorCard({ actor, flagged, onToggleFlag }) {
  const cfg = CATS[actor.c] || { dot: '#888' };
  const isFlagged = flagged.has(actor.n);
  return (
    <div className={`card${isFlagged ? ' card--flagged' : ''}`}>
      <div className="card-top">
        <div className="card-name">{actor.n}</div>
        <div className="card-top-right">
          <button
            className={`flag-btn${isFlagged ? ' flag-btn--active' : ''}`}
            onClick={() => onToggleFlag(actor.n)}
            title={isFlagged ? 'Remove flag' : 'Flag for review'}
          >🚩</button>
          <span className="card-dot" style={{ background: cfg.dot }} />
        </div>
      </div>
      <p className="card-role">{actor.r}</p>
      <div className="card-tags">
        {actor.t.map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
      {actor.link && (
        <a href={actor.link} target="_blank" rel="noopener noreferrer" className="card-link">
          → docs
        </a>
      )}
    </div>
  );
}

function SectionHeader({ cat }) {
  const cfg = CATS[cat];
  return (
    <div className="section-header">
      <span className="section-dot" style={{ background: cfg.dot }} />
      <span className="section-name">{cat}</span>
      <span className="section-desc">— {cfg.desc}</span>
    </div>
  );
}

export default function App() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [flagged, setFlagged] = useState(loadFlagged);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [undoStack, setUndoStack] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);

  const filterOptions = useMemo(
    () => ['All', ...CAT_ORDER.filter(c => c !== PRECEDENT_CAT)],
    []
  );

  function toggleFlag(name) {
    setFlagged(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      saveFlagged(next);
      return next;
    });
  }

  const filtered = useMemo(() => {
    let list = ACTORS.filter(a => a.c !== PRECEDENT_CAT);
    if (showFlaggedOnly) {
      return list.filter(a => flagged.has(a.n));
    }
    if (activeFilter !== 'All') list = list.filter(a => a.c === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.n.toLowerCase().includes(q) ||
        a.r.toLowerCase().includes(q) ||
        a.t.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeFilter, search, flagged, showFlaggedOnly]);

  const byCat = useMemo(() => {
    const map = {};
    filtered.forEach(a => {
      if (!map[a.c]) map[a.c] = [];
      map[a.c].push(a);
    });
    return map;
  }, [filtered]);

  const taxonomyCount = ACTORS.filter(a => a.c !== PRECEDENT_CAT).length;
  const flagCount = flagged.size;

  function clearAllFlags() {
    setUndoStack(new Set(flagged));
    const cleared = new Set();
    setFlagged(cleared);
    saveFlagged(cleared);
    if (undoTimer) clearTimeout(undoTimer);
    const t = setTimeout(() => {
      setUndoStack(null);
      setShowFlaggedOnly(false);
    }, 5000);
    setUndoTimer(t);
  }

  function undoClear() {
    if (!undoStack) return;
    setFlagged(undoStack);
    saveFlagged(undoStack);
    setUndoStack(null);
    if (undoTimer) clearTimeout(undoTimer);
    setUndoTimer(null);
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-text">
            <div className="header-eyebrow">CCHB · CAT–CASH–HUMANBOND PROTOCOL</div>
            <h1 className="header-title">Ecosystem</h1>
            <p className="header-sub">
              {taxonomyCount} actors across {CAT_ORDER.filter(c => c !== PRECEDENT_CAT).length} categories
            </p>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-n">{taxonomyCount}</div>
              <div className="stat-l">actors</div>
            </div>
          </div>
        </div>
      </header>

      <div className="controls">
        <div className="controls-inner">
          {!showFlaggedOnly && (
            <div className="filter-wrap">
              {filterOptions.map(f => (
                <button
                  key={f}
                  className={`filter-btn ${activeFilter === f ? 'filter-btn--active' : ''}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          {!showFlaggedOnly && (
            <input
              className="search-input"
              type="text"
              placeholder="Search actors, roles, tags…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          )}

          <div className="flag-controls">
            <button
              className={`flag-toggle${showFlaggedOnly ? ' flag-toggle--active' : ''}${flagCount === 0 ? ' flag-toggle--empty' : ''}`}
              onClick={() => setShowFlaggedOnly(p => !p)}
              title={flagCount === 0 ? 'No cards flagged yet' : showFlaggedOnly ? 'Back to full view' : 'Show flagged cards only'}
            >
              🚩 {flagCount} flagged
            </button>
            {flagCount > 0 && (
              <>
                <button
                  className="download-btn"
                  onClick={() => downloadFlaggedCSV(flagged)}
                  title="Download flagged cards as CSV"
                >
                  ↓ CSV
                </button>
                {showFlaggedOnly && (
                  <button
                    className="clear-btn"
                    onClick={clearAllFlags}
                    title="Remove all flags"
                  >
                    × Clear all
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {undoStack && (
        <div className="undo-toast">
          All flags cleared.
          <button className="undo-btn" onClick={undoClear}>↩ Undo</button>
        </div>
      )}

      <main className="main-content">
        {filtered.length === 0 ? (
          <div className="empty-state">
            {showFlaggedOnly ? 'No flagged cards yet — click 🚩 on any card to flag it.' : 'No actors match your search.'}
          </div>
        ) : showFlaggedOnly ? (
          CAT_ORDER.map(cat => {
            const actors = byCat[cat];
            if (!actors?.length) return null;
            return (
              <section key={cat} className="cat-section">
                <SectionHeader cat={cat} />
                <div className="actors-grid">
                  {actors.map(a => <ActorCard key={a.n} actor={a} flagged={flagged} onToggleFlag={toggleFlag} />)}
                </div>
              </section>
            );
          })
        ) : (
          CAT_ORDER.filter(c => c !== PRECEDENT_CAT).map(cat => {
            const actors = byCat[cat];
            if (!actors?.length) return null;
            return (
              <section key={cat} className="cat-section">
                <SectionHeader cat={cat} />
                <div className="actors-grid">
                  {actors.map(a => <ActorCard key={a.n} actor={a} flagged={flagged} onToggleFlag={toggleFlag} />)}
                </div>
              </section>
            );
          })
        )}
      </main>

      <footer className="app-footer">
        <span>CCHB Ecosystem · {new Date().getFullYear()} · CAT–CASH–HUMANBOND Protocol</span>
      </footer>
    </div>
  );
}
