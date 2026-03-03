import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { API_BASE } from '../lib/env';

// ─── Types ────────────────────────────────────────────────────────────────────
type Suggestion = {
  label: string;
  q: string;
  best_price: number | null;
  chain_count: number;
};

type ChainPrice = {
  chain: string;
  price: number;
  name: string;
  updated_at: string | null;
};

type Status = 'idle' | 'searching' | 'done' | 'not_found';

// ─── Chain colors ─────────────────────────────────────────────────────────────
const CHAIN_COLORS: Record<string, string> = {
  IKI: 'var(--accent-green)', Iki: 'var(--accent-green)',
  MAXIMA: 'var(--accent-red)', Maxima: 'var(--accent-red)',
  RIMI: '#3B82F6', Rimi: '#3B82F6',
  NORFA: '#FF9500', Norfa: '#FF9500',
  LIDL: '#FFD700', Lidl: '#FFD700',
  'AIBĖ': 'var(--accent-pink)', 'Aibė': 'var(--accent-pink)',
  'ČIA MARKET': '#FF6B35', 'Čia Market': '#FF6B35',
  'EXPRESS MARKET': 'var(--accent-blue)', 'Express Market': 'var(--accent-blue)',
  'ŠILAS': '#7CFC00', 'Šilas': '#7CFC00',
};
function chainColor(c: string) { return CHAIN_COLORS[c] ?? '#9b92b3'; }
function money(v: number) { return `€${v.toFixed(2)}`; }

// ─── Line chart (grows as points are added) ───────────────────────────────────
function LiveLineChart({ points, searching }: { points: ChainPrice[]; searching: boolean }) {
  const sorted = [...points].sort((a, b) => a.price - b.price);
  if (!sorted.length) return null;

  const prices = sorted.map((c) => c.price);
  const maxP = Math.max(...prices);
  const minP = Math.min(...prices);
  const range = Math.max(0.01, maxP - minP);

  const W = 600; const H = 185;
  const PL = 48; const PR = 24; const PT = 28; const PB = 44;
  const cW = W - PL - PR; const cH = H - PT - PB;

  const xPos = (i: number) => PL + (sorted.length > 1 ? (i * cW) / (sorted.length - 1) : cW / 2);
  const yPos = (p: number) => PT + cH - ((p - minP) / range) * cH;
  const pts = sorted.map((c, i) => ({ x: xPos(i), y: yPos(c.price), ...c }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${pts[pts.length - 1].x} ${PT + cH} L ${pts[0].x} ${PT + cH} Z`;

  return (
    <div style={{ position: 'relative', overflowX: 'auto' }}>
      {searching && (
        <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--accent-blue)', fontWeight: 600 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-blue)', animation: 'lc-pulse 1s ease-in-out infinite' }} />
          Ieškoma…
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', minWidth: Math.max(sorted.length * 80, 260) }}>
        <defs>
          <linearGradient id="lc-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,240,255,0.15)" />
            <stop offset="100%" stopColor="rgba(0,240,255,0)" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = PT + cH * (1 - f);
          return (
            <g key={f}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              <text x={PL - 5} y={y + 4} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.3)">
                {(minP + range * f).toFixed(2)}
              </text>
            </g>
          );
        })}

        {pts.length > 1 && (
          <>
            <path d={areaD} fill="url(#lc-area)" />
            <path d={pathD} fill="none" stroke="rgba(0,240,255,0.55)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}

        <line x1={PL} y1={PT + cH} x2={W - PR} y2={PT + cH} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />

        {pts.map((p, i) => {
          const isBest = p.price === minP;
          const color = chainColor(p.chain);
          return (
            <g key={`${p.chain}-${i}`} style={{ animation: 'lc-pop 0.35s cubic-bezier(.34,1.56,.64,1) both' }}>
              <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize={10} fill={isBest ? 'var(--accent-green)' : color} fontWeight="700">
                {money(p.price)}
              </text>
              {isBest && <circle cx={p.x} cy={p.y} r={10} fill="none" stroke="var(--accent-green)" strokeWidth={1.5} opacity={0.4} />}
              <circle cx={p.x} cy={p.y} r={isBest ? 7 : 5} fill={color} stroke="rgba(8,3,18,0.8)" strokeWidth={2} />
              <text x={p.x} y={PT + cH + 16} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.6)" fontWeight="600">
                {p.chain.length > 8 ? p.chain.slice(0, 7) + '…' : p.chain}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function ComparePage() {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSugg, setShowSugg] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [points, setPoints] = useState<ChainPrice[]>([]);
  const [queryLabel, setQueryLabel] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // Close SSE on unmount
  useEffect(() => () => { esRef.current?.close(); }, []);

  // URL param ?q= on mount
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) { setInputValue(q); startSearch(q); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopSearch = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
  }, []);

  const startSearch = useCallback((q: string) => {
    stopSearch();
    setPoints([]);
    setQueryLabel(q);
    setStatus('searching');

    const es = new EventSource(`${API_BASE}/products/live-search?q=${encodeURIComponent(q)}`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as {
          done?: boolean; not_found?: boolean; error?: boolean;
          chain?: string; price?: number; name?: string; updated_at?: string | null;
        };
        if (data.not_found) { es.close(); setStatus('not_found'); return; }
        if (data.error) { es.close(); setStatus('not_found'); return; }
        if (data.done) { es.close(); setStatus('done'); return; }
        if (data.chain && data.price != null) {
          setPoints((prev) => {
            // Skip duplicate chain (keep lowest)
            const idx = prev.findIndex((p) => p.chain === data.chain!);
            if (idx !== -1) {
              if (data.price! < prev[idx].price) {
                const next = [...prev];
                next[idx] = { chain: data.chain!, price: data.price!, name: data.name ?? '', updated_at: data.updated_at ?? null };
                return next;
              }
              return prev;
            }
            return [...prev, { chain: data.chain!, price: data.price!, name: data.name ?? '', updated_at: data.updated_at ?? null }];
          });
        }
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => { es.close(); setStatus(points.length > 0 ? 'done' : 'not_found'); };
  }, [stopSearch, points.length]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(`${API_BASE}/products/autocomplete?q=${encodeURIComponent(q)}`);
      const data = await res.json() as Suggestion[];
      setSuggestions(Array.isArray(data) ? data : []);
    } catch { setSuggestions([]); }
  }, []);

  const onInputChange = (val: string) => {
    setInputValue(val);
    setShowSugg(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void fetchSuggestions(val), 280);
  };

  const onSelect = (s: Suggestion) => {
    setInputValue(s.label);
    setSuggestions([]);
    setShowSugg(false);
    startSearch(s.q);
  };

  const onSearch = () => {
    const q = inputValue.trim();
    if (q.length < 2) return;
    setSuggestions([]);
    setShowSugg(false);
    startSearch(q);
  };

  const sorted = [...points].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0];

  return (
    <div className="cp">
      <header className="cp-nav glass">
        <Link to="/" className="cp-back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div className="cp-nav__title">
          <strong>Kainų Palyginimas</strong>
          <Badge style={{ fontSize: '0.68rem', padding: '0.12rem 0.5rem' }}>Nemokama</Badge>
        </div>
      </header>

      <div className="cp-shell">

        {/* Search bar */}
        <div className="cp-search-row">
          <div className="cp-search">
            <svg className="cp-search__icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="cp-search__input"
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); if (e.key === 'Escape') setShowSugg(false); }}
              onFocus={() => suggestions.length && setShowSugg(true)}
              onBlur={() => setTimeout(() => setShowSugg(false), 150)}
              placeholder="Pvz: sviestas, pienas, duona…"
              autoComplete="off"
            />
            {status === 'searching' && <div className="cp-spinner" />}
          </div>
          <Button onClick={onSearch} disabled={status === 'searching'} style={{ flexShrink: 0 }}>
            Ieškoti
          </Button>

          {showSugg && suggestions.length > 0 && (
            <div className="cp-autocomplete glass">
              {suggestions.map((s, i) => (
                <button key={i} type="button" className="cp-ac__item" onMouseDown={() => onSelect(s)}>
                  <span className="cp-ac__name">{s.label}</span>
                  <span className="cp-ac__meta">
                    {s.chain_count > 0 && <span className="cp-ac__chains">{s.chain_count} tinkl.</span>}
                    {s.best_price != null && <span className="cp-ac__price">{money(s.best_price)}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── NOT FOUND ── */}
        {status === 'not_found' && (
          <div className="glass cp-notfound">
            <div className="cp-notfound__emoji">🔍</div>
            <div className="cp-notfound__title">Šiuo metu šios prekės duomenų neturime</div>
            <p className="cp-notfound__text">
              Galime pabandyti surasti kainų informaciją parduotuvių svetainėse.
            </p>
            <div className="cp-notfound__btns">
              <Button
                glow
                onClick={() => {
                  // Redirect to AI assistant with pre-filled query
                  window.location.href = `/app/overview?ask=${encodeURIComponent(`Kiek kainuoja ${queryLabel} įvairiose parduotuvėse?`)}`;
                }}
              >
                🤖 Ieškoti su AI
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setStatus('idle'); setInputValue(''); setSuggestions([]); setPoints([]); setQueryLabel(''); }}
              >
                ← Ieškosiu kito
              </Button>
            </div>
          </div>
        )}

        {/* ── RESULTS (searching + done) ── */}
        {(status === 'searching' || status === 'done') && (
          <div className="cp-results">

            {/* Header */}
            {queryLabel && (
              <div className="glass cp-result-hdr">
                <div className="cp-result-hdr__label">Ieškota</div>
                <div className="cp-result-hdr__name">{queryLabel}</div>
                {status === 'searching' && points.length === 0 && (
                  <div className="cp-result-hdr__searching">Tikrinamos parduotuvės…</div>
                )}
                {cheapest && status === 'done' && (
                  <div className="cp-result-hdr__best">
                    <span className="cp-result-hdr__dot" />
                    Pigiausia: <strong>{money(cheapest.price)}</strong> · {cheapest.chain}
                  </div>
                )}
                {cheapest && status === 'searching' && (
                  <div className="cp-result-hdr__best" style={{ opacity: 0.7 }}>
                    <span className="cp-result-hdr__dot" style={{ background: 'var(--accent-blue)', boxShadow: '0 0 8px var(--accent-blue)' }} />
                    Kol kas pigiausia: <strong>{money(cheapest.price)}</strong> · {cheapest.chain}
                  </div>
                )}
              </div>
            )}

            {/* Chart */}
            <div className="glass cp-chart-card">
              <div className="cp-chart-card__label">
                Kainos tinkluose
                {status === 'searching' && points.length > 0 && (
                  <span style={{ marginLeft: 8, color: 'var(--accent-blue)', fontWeight: 700 }}>
                    · rasti {points.length} tinkl.
                  </span>
                )}
              </div>
              {points.length === 0 ? (
                <div className="cp-chart-loading">
                  <div className="cp-chart-loading__bar" /><div className="cp-chart-loading__bar" /><div className="cp-chart-loading__bar" />
                </div>
              ) : (
                <LiveLineChart points={sorted} searching={status === 'searching'} />
              )}
            </div>

            {/* List */}
            {sorted.length > 0 && (
              <div className="glass cp-list">
                {sorted.map((c, i) => (
                  <div key={`${c.chain}-${i}`} className={`cp-list__row${i === 0 ? ' cp-list__row--best' : ''}`}>
                    <div className="cp-list__rank" style={{ background: chainColor(c.chain) }}>{i + 1}</div>
                    <div className="cp-list__info">
                      <div className="cp-list__chain">{c.chain}</div>
                      {c.updated_at && <div className="cp-list__date">{new Date(c.updated_at).toLocaleDateString('lt-LT')}</div>}
                    </div>
                    <div className="cp-list__price-col">
                      <div className={`cp-list__price${i === 0 ? ' cp-list__price--best' : ''}`}>{money(c.price)}</div>
                      {cheapest && i > 0 && <div className="cp-list__diff">+{money(c.price - cheapest.price)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── IDLE empty state ── */}
        {status === 'idle' && (
          <div className="cp-empty-state">
            <div className="cp-empty-state__icon">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.55">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="cp-empty-state__title">Palygink kainas visuose tinkluose</div>
            <p className="cp-empty-state__text">
              Surask pigiausią kur pirkti — Maxima, IKI, Rimi, Norfa, Lidl, Aibė ir kt.
            </p>
            <div className="cp-empty-state__examples">
              {['Sviestas', 'Pienas', 'Duona', 'Kiaušiniai'].map((ex) => (
                <button key={ex} type="button" className="cp-example-chip" onClick={() => { setInputValue(ex); startSearch(ex); }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .cp { min-height: 100dvh; background: var(--bg-base); color: var(--text-main); font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif; }
        .cp-nav { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; gap: .75rem; padding: .9rem 1.25rem; border-radius: 0; border-top: none; border-left: none; border-right: none; }
        .cp-back { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,.06); color: var(--accent-blue); text-decoration: none; flex-shrink: 0; }
        .cp-back:hover { background: rgba(0,240,255,.12); }
        .cp-nav__title { display: flex; align-items: center; gap: .6rem; font-weight: 700; font-size: 1rem; }
        .cp-shell { width: min(640px, calc(100% - 2rem)); margin: 1.5rem auto; display: grid; gap: 1rem; }

        .cp-search-row { display: flex; gap: .5rem; position: relative; align-items: center; }
        .cp-search { flex: 1; position: relative; display: flex; align-items: center; background: var(--bg-elevated); border: 1.5px solid var(--surface-outline); border-radius: var(--radius-md); transition: border-color .2s, box-shadow .2s; }
        .cp-search:focus-within { border-color: rgba(0,240,255,.45); box-shadow: 0 0 0 3px rgba(0,240,255,.1); }
        .cp-search__icon { position: absolute; left: .9rem; color: var(--text-muted); pointer-events: none; flex-shrink: 0; }
        .cp-search__input { width: 100%; background: none; border: none; outline: none; padding: .75rem .9rem .75rem 2.6rem; color: var(--text-main); font-size: .95rem; font-family: inherit; }
        .cp-search__input::placeholder { color: var(--text-muted); }
        .cp-spinner { position: absolute; right: .9rem; width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(0,240,255,.25); border-top-color: var(--accent-blue); animation: cp-spin .7s linear infinite; flex-shrink: 0; }

        .cp-autocomplete { position: absolute; top: calc(100% + 6px); left: 0; right: 72px; z-index: 100; overflow: hidden; border-radius: var(--radius-md); }
        .cp-ac__item { width: 100%; background: none; border: none; border-bottom: 1px solid rgba(255,255,255,.06); padding: .65rem 1rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer; color: var(--text-main); text-align: left; font-family: inherit; font-size: .88rem; transition: background .15s; }
        .cp-ac__item:last-child { border-bottom: none; }
        .cp-ac__item:hover { background: rgba(255,255,255,.05); }
        .cp-ac__name { flex: 1; margin-right: .5rem; }
        .cp-ac__meta { display: flex; align-items: center; gap: .4rem; flex-shrink: 0; }
        .cp-ac__chains { font-size: .75rem; color: var(--text-muted); }
        .cp-ac__price { color: var(--accent-green); font-weight: 700; font-size: .85rem; }

        .cp-notfound { padding: 2.5rem 1.5rem; text-align: center; }
        .cp-notfound__emoji { font-size: 2.8rem; margin-bottom: .75rem; }
        .cp-notfound__title { font-weight: 800; font-size: 1.05rem; margin-bottom: .5rem; }
        .cp-notfound__text { font-size: .875rem; color: var(--text-muted); margin-bottom: 1.5rem; line-height: 1.55; }
        .cp-notfound__btns { display: flex; gap: .75rem; justify-content: center; flex-wrap: wrap; }

        .cp-results { display: grid; gap: .875rem; }
        .cp-result-hdr { padding: 1rem 1.25rem; border-top: 2px solid var(--accent-blue) !important; }
        .cp-result-hdr__label { font-size: .7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: .08em; }
        .cp-result-hdr__name { font-weight: 700; font-size: 1.1rem; margin-top: 2px; }
        .cp-result-hdr__searching { margin-top: .4rem; font-size: .82rem; color: var(--accent-blue); }
        .cp-result-hdr__best { margin-top: .4rem; font-size: .84rem; color: var(--accent-green); display: flex; align-items: center; gap: .4rem; }
        .cp-result-hdr__dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-green); box-shadow: 0 0 8px var(--accent-green); flex-shrink: 0; }

        .cp-chart-card { padding: 1.25rem 1rem .75rem; }
        .cp-chart-card__label { font-size: .7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: .08em; margin-bottom: .75rem; }
        .cp-chart-loading { display: flex; align-items: flex-end; gap: 8px; height: 80px; padding: 0 4px; }
        .cp-chart-loading__bar { flex: 1; border-radius: 6px; background: rgba(255,255,255,.07); animation: cp-skeleton 1.4s ease-in-out infinite; }
        .cp-chart-loading__bar:nth-child(1) { height: 60%; animation-delay: 0s; }
        .cp-chart-loading__bar:nth-child(2) { height: 85%; animation-delay: .2s; }
        .cp-chart-loading__bar:nth-child(3) { height: 40%; animation-delay: .4s; }

        .cp-list { overflow: hidden; }
        .cp-list__row { display: flex; align-items: center; gap: .75rem; padding: .85rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,.06); }
        .cp-list__row:last-child { border-bottom: none; }
        .cp-list__row--best { background: rgba(0,230,118,.05); }
        .cp-list__rank { width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: .75rem; font-weight: 800; color: #080312; }
        .cp-list__info { flex: 1; min-width: 0; }
        .cp-list__chain { font-weight: 600; font-size: .92rem; }
        .cp-list__date { font-size: .72rem; color: var(--text-muted); }
        .cp-list__price-col { text-align: right; }
        .cp-list__price { font-weight: 700; font-size: 1rem; }
        .cp-list__price--best { color: var(--accent-green); }
        .cp-list__diff { font-size: .72rem; color: var(--accent-pink); }

        .cp-empty-state { text-align: center; padding: 3rem 1rem; }
        .cp-empty-state__icon { display: flex; justify-content: center; margin-bottom: 1rem; }
        .cp-empty-state__title { font-weight: 700; font-size: 1.05rem; margin-bottom: .5rem; }
        .cp-empty-state__text { font-size: .88rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 1.25rem; }
        .cp-empty-state__examples { display: flex; gap: .5rem; justify-content: center; flex-wrap: wrap; }
        .cp-example-chip { background: rgba(0,240,255,.07); border: 1px solid rgba(0,240,255,.25); border-radius: 20px; color: var(--accent-blue); font-size: .82rem; font-weight: 600; padding: .35rem .9rem; cursor: pointer; transition: background .15s; font-family: inherit; }
        .cp-example-chip:hover { background: rgba(0,240,255,.14); }

        @keyframes cp-spin { to { transform: rotate(360deg); } }
        @keyframes cp-skeleton { 0%,100% { opacity: .4; } 50% { opacity: .8; } }
        @keyframes lc-pulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(1.3); } }
        @keyframes lc-pop { from { opacity: 0; transform: scale(.4); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
