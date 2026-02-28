import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import clsx from 'clsx';

// Demo duomenys grafikui
const mockChartData = [
  2.40, 2.45, 2.50, 2.48, 2.42, 2.30, 2.25, 2.35, 2.40, 2.50, 2.55, 2.60, 2.65, 2.55, 2.45, 2.35, 2.20, 2.10, 1.95, 1.80, 1.90, 2.05, 2.15, 2.30, 2.45
];

export function MarketPage() {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Nustatome ar kaina dabar kyla ar krenta (paskutiniai 2 taškai)
  const isDropping = mockChartData[mockChartData.length - 1] < mockChartData[mockChartData.length - 2];
  const chartColor = isDropping ? 'var(--accent-green)' : 'var(--accent-red)';
  
  // Sukuriame SVG liniją iš duomenų
  const min = Math.min(...mockChartData);
  const max = Math.max(...mockChartData);
  const range = max - min;
  
  const points = mockChartData.map((val, i) => {
    const x = (i / (mockChartData.length - 1)) * 100;
    const y = 100 - (((val - min) / range) * 80 + 10); // Paliekame 10% paddingą
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="market-container flex flex-col h-full gap-6">
      
      {/* Paieška */}
      <div className="relative mt-2">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input 
          type="text" 
          className="w-full glass rounded-full py-4 pl-12 pr-4 text-white outline-none focus:border-[var(--accent-blue)] focus:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all bg-[rgba(20,10,30,0.6)]"
          placeholder="Ieškoti prekės (pvz. Dvaro sviestas)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Hero Prekė */}
      <Card className="flex-1 flex flex-col relative overflow-hidden bg-[linear-gradient(180deg,rgba(39,23,68,0.2),rgba(20,10,35,0.8))]">
        <div className="flex justify-between items-start mb-8 z-10">
          <div>
            <h2 className="text-3xl font-bold mb-1">Dvaro Sviestas 82%</h2>
            <p className="text-[var(--text-muted)]">Pieno Žvaigždės, 200g</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold" style={{ color: chartColor }}>2.45 €</div>
            <div className={clsx("text-sm flex items-center justify-end gap-1 mt-1", isDropping ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isDropping ? 'rotate(180deg)' : 'none' }}>
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
              <span>{isDropping ? '-5.4%' : '+2.1%'} (7d)</span>
            </div>
          </div>
        </div>

        {/* Info blokai */}
        <div className="grid grid-cols-3 gap-3 mb-8 z-10">
          <div className="glass p-3 rounded-xl text-center bg-[rgba(0,0,0,0.2)]">
            <div className="text-xs text-[var(--text-muted)] mb-1">Istorinis dugnas</div>
            <div className="font-bold">1.80 €</div>
          </div>
          <div className="glass p-3 rounded-xl text-center bg-[rgba(0,0,0,0.2)]">
            <div className="text-xs text-[var(--text-muted)] mb-1">Vidurkis</div>
            <div className="font-bold">2.35 €</div>
          </div>
          <div className="glass p-3 rounded-xl text-center bg-[rgba(0,0,0,0.2)]">
            <div className="text-xs text-[var(--text-muted)] mb-1">Pikas</div>
            <div className="font-bold">2.65 €</div>
          </div>
        </div>

        {/* Grafikas */}
        <div className="flex-1 relative min-h-[250px] w-full">
          {/* Fono grid'as */}
          <div className="absolute inset-0 border-b border-[rgba(255,255,255,0.05)] border-dashed"></div>
          <div className="absolute inset-0 border-b border-[rgba(255,255,255,0.05)] border-dashed top-[50%]"></div>
          
          <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
            {/* Gradient fill po linija */}
            <defs>
              <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity="0.4" />
                <stop offset="100%" stopColor={chartColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <polygon 
              points={`0,100 ${points} 100,100`} 
              fill="url(#chartGradient)" 
            />
            {/* Neoninė ištisinė linija */}
            <polyline 
              points={points} 
              fill="none" 
              stroke={chartColor} 
              strokeWidth="3" 
              vectorEffect="non-scaling-stroke"
              style={{ filter: `drop-shadow(0 0 8px ${chartColor})` }}
            />
            {/* Dabartinis taškas */}
            <circle 
              cx="100" 
              cy={100 - (((mockChartData[mockChartData.length-1] - min) / range) * 80 + 10)} 
              r="4" 
              fill="var(--bg-surface)" 
              stroke={chartColor} 
              strokeWidth="2"
              style={{ filter: `drop-shadow(0 0 10px ${chartColor})` }}
            />
          </svg>
        </div>

        {/* Alert mygtukas */}
        <button className="glass w-full py-4 mt-6 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-[rgba(255,255,255,0.05)] transition-colors z-10 border-[rgba(255,255,255,0.15)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          Pranešti, kai kris žemiau 2.00 €
        </button>

      </Card>
    </div>
  );
}
