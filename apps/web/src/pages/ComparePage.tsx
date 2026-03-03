import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { API_BASE } from '../lib/env';

type AutocompleteItem = {
  id: string;
  name: string;
  best_price: number | null;
  store_chain: string | null;
};

type ChainPrice = {
  chain: string;
  price: number;
  updated_at: string | null;
};

const CHAIN_COLORS: Record<string, string> = {
  IKI:              'var(--accent-green)',
  Iki:              'var(--accent-green)',
  MAXIMA:           'var(--accent-red)',
  Maxima:           'var(--accent-red)',
  RIMI:             '#3B82F6',
  Rimi:             '#3B82F6',
  NORFA:            '#FF9500',
  Norfa:            '#FF9500',
  LIDL:             '#FFD700',
  Lidl:             '#FFD700',
  'AIBĖ':           'var(--accent-pink)',
  'Aibė':           'var(--accent-pink)',
  'ČIA MARKET':     '#FF6B35',
  'Čia Market':     '#FF6B35',
  'EXPRESS MARKET': 'var(--accent-blue)',
  'Express Market': 'var(--accent-blue)',
  'ŠILAS':          '#7CFC00',
  'Šilas':          '#7CFC00',
};

function chainColor(chain: string): string {
  return CHAIN_COLORS[chain] ?? '#9b92b3';
}

function money(v: number) {
  return `€${v.toFixed(2)}`;
}

function LineChart({ chains }: { chains: ChainPrice[] }) {
  if (!chains.length) return null;
  const prices = chains.map((c) => c.price);
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const range = Math.max(0.01, max - min);

  const W = 600;
  const H = 180;
  const PAD_L = 48;
  const PAD_R = 24;
  const PAD_T = 28;
  const PAD_B = 44;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const xStep = chains.length > 1 ? chartW / (chains.length - 1) : chartW / 2;

  function xPos(i: number) {
    return PAD_L + (chains.length > 1 ? i * xStep : chartW / 2);
  }
  function yPos(price: number) {
    return PAD_T + chartH - ((price - min) / range) * chartH;
  }

  const points = chains.map((c, i) => ({ x: xPos(i), y: yPos(c.price), ...c }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const gradId = 'lc-grad';

  return (
    <div style={{ overflowX: 'auto', width: '100%' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: 'block', minWidth: Math.max(chains.length * 80, 280) }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,240,255,0.15)" />
            <stop offset="100%" stopColor="rgba(0,240,255,0)" />
          </linearGradient>
        </defs>

        {/* Y grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const y = PAD_T + chartH * (1 - f);
          const val = min + range * f;
          return (
            <g key={f}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              <text x={PAD_L - 6} y={y + 4} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.35)">
                {val.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path
          d={`${pathD} L ${points[points.length - 1].x} ${PAD_T + chartH} L ${points[0].x} ${PAD_T + chartH} Z`}
          fill={`url(#${gradId})`}
        />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="rgba(0,240,255,0.55)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Points + labels */}
        {points.map((p, i) => {
          const isBest = p.price === min;
          const color = chainColor(p.chain);
          return (
            <g key={`${p.chain}-${i}`}>
              <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize={10} fill={isBest ? 'var(--accent-green)' : color} fontWeight="700">
                {money(p.price)}
              </text>
              {isBest && <circle cx={p.x} cy={p.y} r={10} fill="none" stroke="var(--accent-green)" strokeWidth={1.5} opacity={0.4} />}
              <circle cx={p.x} cy={p.y} r={isBest ? 7 : 5} fill={isBest ? 'var(--accent-green)' : color} stroke="rgba(8,3,18,0.8)" strokeWidth={2} />
              <text x={p.x} y={PAD_T + chartH + 16} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.6)" fontWeight="600">
                {p.chain.length > 8 ? p.chain.slice(0, 7) + '…' : p.chain}
              </text>
            </g>
          );
        })}

        {/* X axis */}
        <line x1={PAD_L} y1={PAD_T + chartH} x2={W - PAD_R} y2={PAD_T + chartH} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
      </svg>
    </div>
  );
}

export function ComparePage() {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [result, setResult] = useState<{ query: string; chains: ChainPrice[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setInputValue(q);
      void fetchCompare({ q });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCompare = useCallback(async (params: { q: string }) => {
    setLoading(true);
    setResult(null);
    setNotFound(false);

    try {
      const url = new URL(`${API_BASE}/products/compare`, window.location.href);
      url.searchParams.set('q', params.q);
      const res = await fetch(url.toString());
      const data = await res.json() as Array<{
        product_id: string;
        name: string;
        store_prices: Array<{ chain: string; price: number; updated_at: string | null }>;
      }>;

      if (!Array.isArray(data) || !data.length) { setNotFound(true); return; }

      const first = data[0];
      // Deduplicate by chain — take lowest price per chain
      const chainMap = new Map<string, ChainPrice>();
      for (const sp of (first.store_prices ?? [])) {
        if (sp.price == null) continue;
        const existing = chainMap.get(sp.chain);
        if (!existing || Number(sp.price) < existing.price) {
          chainMap.set(sp.chain, { chain: sp.chain, price: Number(sp.price), updated_at: sp.updated_at ?? null });
        }
      }

      const chains = [...chainMap.values()].sort((a, b) => a.price - b.price);
      if (!chains.length) { setNotFound(true); return; }
      setResult({ query: first.name, chains });
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); return; }
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}&limit=8`);
      const data = await res.json() as Array<{ product_id: string; name: string; best_price: number | null; store_chain: string | null }>;
      setSuggestions(
        Array.isArray(data)
          ? data.map((d) => ({ id: d.product_id, name: d.name, best_price: d.best_price ?? null, store_chain: d.store_chain ?? null }))
          : []
      );
    } catch { setSuggestions([]); }
  }, []);

  const onInputChange = (val: string) => {
    setInputValue(val);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void fetchSuggestions(val), 300);
  };

  const onSelectSuggestion = (item: AutocompleteItem) => {
    setInputValue(item.name);
    setSuggestions([]);
    setShowSuggestions(false);
    void fetchCompare({ q: item.name });
  };

  const onSearch = () => {
    const q = inputValue.trim();
    if (q.length < 2) return;
    setSuggestions([]);
    setShowSuggestions(false);
    void fetchCompare({ q });
  };

  const sorted = result ? [...result.chains].sort((a, b) => a.price - b.price) : [];
  const cheapest = sorted[0];

  return (
    <div className="compare-page">
      <header className="compare-nav glass">
        <Link to="/" className="compare-nav__back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div className="compare-nav__title">
          <strong>Kainų Palyginimas</strong>
          <Badge style={{ fontSize: '0.7rem', padding: '0.15rem 0.55rem' }}>Nemokama</Badge>
        </div>
      </header>

      <div className="compare-shell">
        <div className="compare-search-wrap">
          <div className="compare-search">
            <svg className="compare-search__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="compare-search__input"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); if (e.key === 'Escape') setShowSuggestions(false); }}
              onFocus={() => suggestions.length && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="Pvz: sviestas, pienas, duona…"
              autoComplete="off"
            />
            {loading && <div className="compare-spinner" />}
          </div>
          <Button onClick={onSearch} disabled={loading} style={{ flexShrink: 0 }}>
            Ieškoti
          </Button>

          {showSuggestions && suggestions.length > 0 && (
            <div className="compare-autocomplete glass">
              {suggestions.map((item) => (
                <button key={item.id} type="button" className="compare-autocomplete__item" onMouseDown={() => onSelectSuggestion(item)}>
                  <span className="compare-autocomplete__name">{item.name}</span>
                  {item.best_price != null && <span className="compare-autocomplete__price">{money(item.best_price)}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {notFound && !loading && (
          <div className="compare-empty glass">
            <div className="compare-empty__icon">🔍</div>
            <div className="compare-empty__title">Prekė nerasta</div>
            <p className="compare-empty__text">Patikrinome visas parduotuves — kainų neradome.</p>
          </div>
        )}

        {result && (
          <div className="compare-results">
            <div className="glass compare-result-header">
              <div className="compare-result-header__label">Ieškota</div>
              <div className="compare-result-header__name">{result.query}</div>
              {cheapest && (
                <div className="compare-result-header__best">
                  <span className="compare-result-header__best-dot" />
                  Pigiausia: <strong>{money(cheapest.price)}</strong> · {cheapest.chain}
                </div>
              )}
            </div>

            {sorted.length > 0 && (
              <div className="glass compare-chart-card">
                <div className="compare-chart-card__label">Kainos tinkluose</div>
                <LineChart chains={sorted} />
              </div>
            )}

            <div className="glass compare-list">
              {sorted.map((c, i) => (
                <div key={`${c.chain}-${i}`} className={`compare-list__row${i === 0 ? ' compare-list__row--best' : ''}`}>
                  <div className="compare-list__rank" style={{ background: chainColor(c.chain) }}>{i + 1}</div>
                  <div className="compare-list__info">
                    <div className="compare-list__chain">{c.chain}</div>
                    {c.updated_at && <div className="compare-list__date">{new Date(c.updated_at).toLocaleDateString('lt-LT')}</div>}
                  </div>
                  <div className="compare-list__price-col">
                    <div className={`compare-list__price${i === 0 ? ' compare-list__price--best' : ''}`}>{money(c.price)}</div>
                    {cheapest && i > 0 && <div className="compare-list__diff">+{money(c.price - cheapest.price)}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!result && !loading && !notFound && (
          <div className="compare-empty-state">
            <div className="compare-empty-state__icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="compare-empty-state__title">Palygink kainas visuose tinkluose</div>
            <p className="compare-empty-state__text">
              Surask pigiausią kur pirkti — Maxima, IKI, Rimi, Norfa, Lidl, Aibė ir kt.
            </p>
          </div>
        )}
      </div>

      <style>{`
        .compare-page { min-height: 100dvh; background: var(--bg-base); color: var(--text-main); font-family: 'Outfit', 'Segoe UI', system-ui, sans-serif; }
        .compare-nav { position: sticky; top: 0; z-index: 50; display: flex; align-items: center; gap: 0.75rem; padding: 0.9rem 1.25rem; border-radius: 0; border-top: none; border-left: none; border-right: none; }
        .compare-nav__back { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.06); color: var(--accent-blue); text-decoration: none; transition: background 0.2s; flex-shrink: 0; }
        .compare-nav__back:hover { background: rgba(0,240,255,0.12); }
        .compare-nav__title { display: flex; align-items: center; gap: 0.6rem; font-weight: 700; font-size: 1rem; }
        .compare-shell { width: min(640px, calc(100% - 2rem)); margin: 1.5rem auto; display: grid; gap: 1rem; }
        .compare-search-wrap { display: flex; gap: 0.5rem; position: relative; align-items: center; }
        .compare-search { flex: 1; position: relative; display: flex; align-items: center; background: var(--bg-elevated); border: 1.5px solid var(--surface-outline); border-radius: var(--radius-md); transition: border-color 0.2s, box-shadow 0.2s; }
        .compare-search:focus-within { border-color: rgba(0,240,255,0.45); box-shadow: 0 0 0 3px rgba(0,240,255,0.1); }
        .compare-search__icon { position: absolute; left: 0.9rem; color: var(--text-muted); pointer-events: none; flex-shrink: 0; }
        .compare-search__input { width: 100%; background: none; border: none; outline: none; padding: 0.75rem 0.9rem 0.75rem 2.6rem; color: var(--text-main); font-size: 0.95rem; font-family: inherit; }
        .compare-search__input::placeholder { color: var(--text-muted); }
        .compare-spinner { position: absolute; right: 0.9rem; width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(0,240,255,0.25); border-top-color: var(--accent-blue); animation: compare-spin 0.7s linear infinite; flex-shrink: 0; }
        .compare-autocomplete { position: absolute; top: calc(100% + 6px); left: 0; right: 60px; z-index: 100; overflow: hidden; border-radius: var(--radius-md); }
        .compare-autocomplete__item { width: 100%; background: none; border: none; border-bottom: 1px solid rgba(255,255,255,0.06); padding: 0.65rem 1rem; display: flex; justify-content: space-between; align-items: center; cursor: pointer; color: var(--text-main); text-align: left; font-family: inherit; font-size: 0.88rem; transition: background 0.15s; }
        .compare-autocomplete__item:last-child { border-bottom: none; }
        .compare-autocomplete__item:hover { background: rgba(255,255,255,0.05); }
        .compare-autocomplete__name { flex: 1; margin-right: 0.5rem; }
        .compare-autocomplete__price { color: var(--accent-green); font-weight: 700; font-size: 0.85rem; white-space: nowrap; }
        .compare-empty { padding: 2.5rem; text-align: center; }
        .compare-empty__icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .compare-empty__title { font-weight: 700; font-size: 1rem; margin-bottom: 0.25rem; }
        .compare-empty__text { font-size: 0.85rem; color: var(--text-muted); }
        .compare-results { display: grid; gap: 0.875rem; }
        .compare-result-header { padding: 1rem 1.25rem; border-top: 2px solid var(--accent-blue) !important; box-shadow: 0 8px 32px rgba(0,240,255,0.08) !important; }
        .compare-result-header__label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
        .compare-result-header__name { font-weight: 700; font-size: 1.1rem; margin-top: 2px; }
        .compare-result-header__best { margin-top: 0.5rem; font-size: 0.85rem; color: var(--accent-green); display: flex; align-items: center; gap: 0.4rem; }
        .compare-result-header__best-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent-green); box-shadow: 0 0 8px var(--accent-green); flex-shrink: 0; }
        .compare-chart-card { padding: 1.25rem 1rem 0.75rem; }
        .compare-chart-card__label { font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.75rem; }
        .compare-list { overflow: hidden; }
        .compare-list__row { display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.06); transition: background 0.15s; }
        .compare-list__row:last-child { border-bottom: none; }
        .compare-list__row--best { background: rgba(0,230,118,0.05); }
        .compare-list__rank { width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; color: #080312; }
        .compare-list__info { flex: 1; min-width: 0; }
        .compare-list__chain { font-weight: 600; font-size: 0.92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .compare-list__date { font-size: 0.72rem; color: var(--text-muted); }
        .compare-list__price-col { text-align: right; }
        .compare-list__price { font-weight: 700; font-size: 1rem; }
        .compare-list__price--best { color: var(--accent-green); }
        .compare-list__diff { font-size: 0.72rem; color: var(--accent-pink); }
        .compare-empty-state { text-align: center; padding: 3rem 1rem; }
        .compare-empty-state__icon { display: flex; justify-content: center; margin-bottom: 1rem; }
        .compare-empty-state__title { font-weight: 700; font-size: 1.05rem; margin-bottom: 0.5rem; }
        .compare-empty-state__text { font-size: 0.88rem; color: var(--text-muted); line-height: 1.6; }
        @keyframes compare-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
