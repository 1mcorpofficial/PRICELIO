import { useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Series {
  chain: string;
  prices: (number | null)[];
}
interface HistoryData {
  dates: string[];
  series: Series[];
}
interface TooltipState {
  x: number;
  y: number;
  dateLabel: string;
  points: { chain: string; price: number; color: string }[];
}

// ─── Chain colours (matches ComparePage) ─────────────────────────────────────
const CHAIN_COLORS: Record<string, string> = {
  IKI: '#00E676', Iki: '#00E676',
  MAXIMA: '#FF2A5F', Maxima: '#FF2A5F',
  RIMI: '#3B82F6', Rimi: '#3B82F6',
  NORFA: '#FF9500', Norfa: '#FF9500',
  LIDL: '#FFD700', Lidl: '#FFD700',
  'AIBĖ': '#FF007A', 'Aibė': '#FF007A',
  'ČIA MARKET': '#FF6B35', 'Čia Market': '#FF6B35',
  'EXPRESS MARKET': '#00F0FF', 'Express Market': '#00F0FF',
  'ŠILAS': '#7CFC00', 'Šilas': '#7CFC00',
};
const chainColor = (c: string) => CHAIN_COLORS[c] ?? '#9b92b3';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v: number) => `€${v.toFixed(2)}`;
const fmtDate = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${Number(d)} ${['', 'Sau', 'Vas', 'Kov', 'Bal', 'Geg', 'Bir', 'Lie', 'Rgp', 'Rgs', 'Spa', 'Lap', 'Gru'][Number(m)]}`;
};

// Smooth cubic-bezier path through points
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

// ─── Chart dimensions ─────────────────────────────────────────────────────────
const W = 700;
const H = 220;
const PL = 52; // left padding (y-axis labels)
const PR = 20;
const PT = 20;
const PB = 36; // bottom padding (x-axis labels)
const CW = W - PL - PR;
const CH = H - PT - PB;

// ─── Main component ───────────────────────────────────────────────────────────
export function PriceHistoryChart({ query }: { query: string }) {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoverXIdx, setHoverXIdx] = useState<number | null>(null);
  const [drawn, setDrawn] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!query || query.length < 2) { setData(null); return; }
    setLoading(true);
    setDrawn(false);
    setTooltip(null);
    setHoverXIdx(null);

    const controller = new AbortController();
    const apiBase = (import.meta.env.VITE_API_BASE as string | undefined)?.trim() || '/api';

    fetch(`${apiBase}/products/history?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then(r => r.json())
      .then((d: HistoryData) => {
        setData(d);
        setLoading(false);
        // Trigger draw animation on next frame
        requestAnimationFrame(() => setDrawn(true));
      })
      .catch(() => setLoading(false));

    return () => { controller.abort(); cancelAnimationFrame(animFrameRef.current); };
  }, [query]);

  if (loading) return <ChartSkeleton />;
  if (!data || data.dates.length < 2 || data.series.length === 0) return null;

  // ── Compute scale ──────────────────────────────────────────────────────────
  const allPrices = data.series.flatMap(s => s.prices.filter((p): p is number => p !== null));
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = Math.max(0.05, maxP - minP);
  const paddedMin = minP - range * 0.12;
  const paddedMax = maxP + range * 0.12;
  const paddedRange = paddedMax - paddedMin;

  const xPos = (i: number) =>
    data.dates.length === 1 ? PL + CW / 2 : PL + (i * CW) / (data.dates.length - 1);
  const yPos = (p: number) => PT + CH - ((p - paddedMin) / paddedRange) * CH;

  // ── Y-axis grid lines ──────────────────────────────────────────────────────
  const yTicks = 4;
  const gridLines = Array.from({ length: yTicks + 1 }, (_, i) => {
    const frac = i / yTicks;
    const price = paddedMin + paddedRange * frac;
    return { y: PT + CH * (1 - frac), label: fmt(price) };
  });

  // ── SVG mouse interaction ──────────────────────────────────────────────────
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    // Find closest date index
    let closest = 0;
    let minDist = Infinity;
    data.dates.forEach((_, i) => {
      const dist = Math.abs(xPos(i) - svgX);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    setHoverXIdx(closest);

    const points = data.series
      .map(s => ({ chain: s.chain, price: s.prices[closest] ?? null, color: chainColor(s.chain) }))
      .filter((p): p is { chain: string; price: number; color: string } => p.price !== null);

    const cx = xPos(closest);
    // Tooltip x position (keep within bounds)
    const tooltipX = cx > W * 0.65 ? cx - 160 : cx + 16;
    setTooltip({
      x: tooltipX,
      y: PT,
      dateLabel: fmtDate(data.dates[closest]),
      points,
    });
  };

  const handleMouseLeave = () => { setTooltip(null); setHoverXIdx(null); };

  return (
    <div className="phc">
      {/* Legend */}
      <div className="phc-legend">
        {data.series.slice(0, 8).map(s => {
          const lastPrice = s.prices.filter((p): p is number => p !== null).at(-1);
          const firstPrice = s.prices.filter((p): p is number => p !== null).at(0);
          const change = lastPrice != null && firstPrice != null && firstPrice !== lastPrice
            ? ((lastPrice - firstPrice) / firstPrice) * 100 : null;
          const color = chainColor(s.chain);
          return (
            <div key={s.chain} className="phc-legend__item">
              <span className="phc-legend__dot" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
              <span className="phc-legend__name">{s.chain}</span>
              {lastPrice != null && (
                <span className="phc-legend__price" style={{ color }}>{fmt(lastPrice)}</span>
              )}
              {change != null && (
                <span className="phc-legend__change" style={{ color: change < 0 ? '#00E676' : '#FF2A5F' }}>
                  {change > 0 ? '+' : ''}{change.toFixed(1)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="phc-wrap">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          className="phc-svg"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Grid */}
          {gridLines.map(({ y, label }) => (
            <g key={y}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
              <text x={PL - 6} y={y + 4} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.28)" fontFamily="Outfit, system-ui">{label}</text>
            </g>
          ))}

          {/* X-axis baseline */}
          <line x1={PL} y1={PT + CH} x2={W - PR} y2={PT + CH} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

          {/* X-axis labels */}
          {data.dates.map((d, i) => (
            <text key={d} x={xPos(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.35)" fontFamily="Outfit, system-ui">
              {fmtDate(d)}
            </text>
          ))}

          {/* Hover vertical line */}
          {hoverXIdx !== null && (
            <line
              x1={xPos(hoverXIdx)} y1={PT}
              x2={xPos(hoverXIdx)} y2={PT + CH}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
          )}

          {/* Series lines + area fills */}
          {data.series.map((s) => {
            const color = chainColor(s.chain);
            const segments: { x: number; y: number }[][] = [];
            let current: { x: number; y: number }[] = [];
            s.prices.forEach((p, i) => {
              if (p !== null) {
                current.push({ x: xPos(i), y: yPos(p) });
              } else if (current.length) {
                segments.push(current);
                current = [];
              }
            });
            if (current.length) segments.push(current);

            return (
              <g key={s.chain}>
                {segments.map((seg, si) => {
                  const pathD = smoothPath(seg);
                  const areaD = seg.length > 1
                    ? `${pathD} L ${seg.at(-1)!.x} ${PT + CH} L ${seg[0].x} ${PT + CH} Z`
                    : '';
                  const uid = `phc-area-${s.chain.replace(/\s/g, '')}-${si}`;
                  return (
                    <g key={si}>
                      {areaD && (
                        <>
                          <defs>
                            <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={color} stopOpacity={0.12} />
                              <stop offset="100%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <path d={areaD} fill={`url(#${uid})`} />
                        </>
                      )}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={color}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        opacity={0.85}
                        style={drawn ? {} : { strokeDasharray: 1000, strokeDashoffset: 1000, transition: 'stroke-dashoffset 0.9s ease' }}
                        className={drawn ? 'phc-line-drawn' : ''}
                      />
                    </g>
                  );
                })}

                {/* Dots */}
                {s.prices.map((p, i) => {
                  if (p === null) return null;
                  const isHover = hoverXIdx === i;
                  const isLast = i === s.prices.length - 1 || s.prices.slice(i + 1).every(v => v === null);
                  return (
                    <circle
                      key={i}
                      cx={xPos(i)} cy={yPos(p)}
                      r={isHover ? 6 : isLast ? 4.5 : 3}
                      fill={color}
                      stroke="rgba(8,3,18,0.9)"
                      strokeWidth={isHover ? 2.5 : 1.5}
                      opacity={isHover || isLast ? 1 : 0.6}
                      style={{ transition: 'r 0.15s ease, opacity 0.15s ease' }}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Tooltip card (rendered in SVG for crisp positioning) */}
          {tooltip && (
            <foreignObject x={tooltip.x} y={tooltip.y + 4} width={148} height={Math.min(tooltip.points.length * 22 + 32, 160)}>
              <div className="phc-tooltip">
                <div className="phc-tooltip__date">{tooltip.dateLabel}</div>
                {tooltip.points.map(p => (
                  <div key={p.chain} className="phc-tooltip__row">
                    <span className="phc-tooltip__dot" style={{ background: p.color }} />
                    <span className="phc-tooltip__chain">{p.chain}</span>
                    <span className="phc-tooltip__price" style={{ color: p.color }}>{fmt(p.price)}</span>
                  </div>
                ))}
              </div>
            </foreignObject>
          )}
        </svg>
      </div>

      <style>{`
        .phc { display: grid; gap: .75rem; }
        .phc-legend { display: flex; flex-wrap: wrap; gap: .35rem .75rem; padding: 0 .25rem; }
        .phc-legend__item { display: flex; align-items: center; gap: .3rem; font-size: .75rem; }
        .phc-legend__dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .phc-legend__name { color: rgba(255,255,255,0.55); }
        .phc-legend__price { font-weight: 700; }
        .phc-legend__change { font-size: .68rem; font-weight: 600; }
        .phc-wrap { position: relative; overflow: hidden; border-radius: 12px; }
        .phc-svg { display: block; cursor: crosshair; overflow: visible; }
        .phc-line-drawn { stroke-dasharray: none !important; stroke-dashoffset: 0 !important; }
        .phc-tooltip {
          background: rgba(22,10,40,0.96);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          padding: .45rem .6rem;
          font-family: 'Outfit', system-ui, sans-serif;
          font-size: .75rem;
          backdrop-filter: blur(16px);
          pointer-events: none;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }
        .phc-tooltip__date { color: rgba(255,255,255,0.45); font-size: .68rem; margin-bottom: .35rem; text-transform: uppercase; letter-spacing: .06em; }
        .phc-tooltip__row { display: flex; align-items: center; gap: .3rem; padding: .15rem 0; }
        .phc-tooltip__dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .phc-tooltip__chain { flex: 1; color: rgba(255,255,255,0.65); font-size: .72rem; }
        .phc-tooltip__price { font-weight: 700; font-size: .78rem; }
      `}</style>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div style={{ height: 80, display: 'flex', alignItems: 'flex-end', gap: 6, padding: '0 4px' }}>
      {[55, 80, 40, 70, 55, 65, 45].map((h, i) => (
        <div key={i} style={{
          flex: 1, height: `${h}%`, borderRadius: 6,
          background: 'rgba(255,255,255,0.05)',
          animation: `phc-sk 1.4s ease-in-out ${i * 0.12}s infinite`,
        }} />
      ))}
      <style>{`@keyframes phc-sk { 0%,100%{opacity:.3} 50%{opacity:.7} }`}</style>
    </div>
  );
}
