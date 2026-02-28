import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import clsx from 'clsx';

// Demo produktai autocomplete juostai
const autocompleteSuggestions = [
  { id: 1, name: 'Dvaro Pienas 3.2%', price: 1.45, oldPrice: 1.69, img: '🥛' },
  { id: 2, name: 'Dvaro Sviestas', price: 2.45, oldPrice: 2.89, img: '🧈' },
  { id: 3, name: 'Dvaro Varškė', price: 1.85, oldPrice: 2.15, img: '🥣' },
];

// Demo krepšelio elementai
const initialBasket = [
  { id: 101, name: 'Lavazza Kava', qty: 1, price: 14.99, store: 'Maxima' },
  { id: 102, name: 'Bananas', qty: 5, price: 1.25, store: 'Lidl' },
  { id: 103, name: 'Vištienos krūtinėlė', qty: 1, price: 3.50, store: 'Iki' },
];

export function BasketPage() {
  const [query, setQuery] = useState('');
  const [basket, setBasket] = useState(initialBasket);

  const showSuggestions = query.toLowerCase().startsWith('dva');

  return (
    <div className="basket-container flex flex-col h-full gap-6 pb-[100px] mt-2">
      
      <div className="flex justify-between items-end px-2">
        <div>
          <h2 className="text-3xl font-bold mb-1">Išmanus Krepšelis</h2>
          <p className="text-[var(--text-muted)] text-sm">Pradėk rašyti ir rinkis vizualiai</p>
        </div>
      </div>

      {/* Paieška / Autocomplete */}
      <div className="relative z-20">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <input 
          type="text" 
          className="w-full glass rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-[var(--accent-pink)] transition-all bg-[rgba(20,10,30,0.6)] shadow-soft font-medium text-lg"
          placeholder="Ką nori pirkti? (Pvz: Dvaro...)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        
        {/* Vizualios Autocomplete kortelės (Išsiskleidžia kai pradedi rašyti) */}
        <div className={clsx("autocomplete-scroller flex gap-3 overflow-x-auto py-4 px-1 absolute top-full left-0 w-full transition-all duration-300", showSuggestions ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none")}>
          {autocompleteSuggestions.map(item => (
            <div key={item.id} className="min-w-[140px] glass rounded-xl p-3 flex flex-col gap-2 cursor-pointer hover:border-[var(--accent-pink)] hover:bg-[rgba(255,0,122,0.1)] transition-colors shrink-0 backdrop-blur-3xl bg-[rgba(30,15,50,0.85)] border-[rgba(255,255,255,0.15)] shadow-xl">
              <div className="text-3xl text-center bg-[rgba(0,0,0,0.2)] rounded-lg py-2 border border-[rgba(255,255,255,0.05)]">{item.img}</div>
              <div>
                <div className="text-xs font-bold leading-tight mb-1 truncate">{item.name}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[var(--accent-green)] font-bold">{item.price} €</span>
                  <span className="text-[var(--text-muted)] text-[10px] line-through">{item.oldPrice} €</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Krepšelio Sąrašas */}
      <div className={clsx("flex flex-col gap-3 transition-transform duration-300", showSuggestions && "translate-y-40")}>
        {basket.map(item => (
          <div key={item.id} className="glass rounded-xl p-4 flex items-center justify-between group cursor-grab active:cursor-grabbing hover:bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] relative overflow-hidden">
            {/* Swipe indikatorius kairėje (pažymėti nupirktu) */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent-green)] opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] flex items-center justify-center font-bold text-[var(--accent-blue)]">
                {item.qty}x
              </div>
              <div>
                <div className="font-bold">{item.name}</div>
                <div className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                  Geriausia kaina: {item.store}
                </div>
              </div>
            </div>
            
            <div className="font-bold text-lg">{item.price.toFixed(2)} €</div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="mt-auto">
        <div className="glass rounded-3xl p-5 flex items-center justify-between border-[rgba(0,240,255,0.2)] shadow-glow">
          <div>
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Viso krepšelis</div>
            <div className="text-2xl font-black">19.74 €</div>
          </div>
          <button className="bg-[linear-gradient(90deg,var(--accent-blue),var(--accent-pink))] px-6 py-3 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:scale-105 transition-transform">
            Pradėti Apsipirkimą
          </button>
        </div>
      </div>

    </div>
  );
}
