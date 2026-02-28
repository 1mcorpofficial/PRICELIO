import { Card } from '../../components/ui/Card';
import clsx from 'clsx';

// Demo duomenys garantijoms
const warrantyItems = [
  { id: 1, name: 'Sony WH-1000XM5 Ausinės', store: 'Topo Centras', purchaseDate: '2025-11-20', warrantyMonths: 24, price: 349.99, icon: '🎧', isExpiringSoon: false },
  { id: 2, name: 'Nike Bėgimo Batai', store: 'Sportland', purchaseDate: '2026-02-14', warrantyMonths: 1, price: 129.00, icon: '👟', isExpiringSoon: true },
  { id: 3, name: 'Dyson Dulkių Siurblys', store: 'Senukai', purchaseDate: '2024-05-10', warrantyMonths: 24, price: 599.00, icon: '🧹', isExpiringSoon: false },
];

export function WarrantyPage() {
  return (
    <div className="warranty-container flex flex-col h-full gap-6 pb-[100px] mt-2">
      
      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-3xl font-bold mb-1">Garantijų Seifas</h2>
          <p className="text-[var(--text-muted)] text-sm">Tavo skaitmeniniai čekiai vienoje vietoje</p>
        </div>
        <div className="w-12 h-12 rounded-full glass flex items-center justify-center border-[rgba(0,240,255,0.3)] shadow-[0_0_15px_rgba(0,240,255,0.2)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {warrantyItems.map((item) => {
          const isExpiring = item.isExpiringSoon;
          const statusColor = isExpiring ? 'var(--accent-red)' : 'var(--accent-green)';
          
          return (
            <div key={item.id} className="glass rounded-2xl p-4 flex flex-col gap-4 border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)] transition-colors relative overflow-hidden">
              
              {/* Jei baigiasi garantija - raudonas švytėjimas */}
              {isExpiring && <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-red)] opacity-10 blur-3xl rounded-full"></div>}

              <div className="flex justify-between items-start z-10">
                <div className="flex items-center gap-3">
                  <div className="text-4xl bg-[rgba(0,0,0,0.3)] p-2 rounded-xl border border-[rgba(255,255,255,0.05)]">
                    {item.icon}
                  </div>
                  <div>
                    <div className="font-bold text-lg leading-tight">{item.name}</div>
                    <div className="text-sm text-[var(--text-muted)] mt-1">{item.store} • {item.price.toFixed(2)} €</div>
                  </div>
                </div>
                
                <button className="text-[var(--accent-blue)] text-sm font-bold flex items-center gap-1 bg-[rgba(0,240,255,0.1)] px-3 py-1.5 rounded-lg border border-[rgba(0,240,255,0.2)] hover:bg-[rgba(0,240,255,0.2)] transition-colors">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  Čekis
                </button>
              </div>

              <div className="bg-[rgba(0,0,0,0.3)] rounded-xl p-3 flex justify-between items-center border border-[rgba(255,255,255,0.03)] z-10">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Pirkimo data</span>
                  <span className="font-medium text-sm">{item.purchaseDate}</span>
                </div>
                
                <div className="w-[1px] h-8 bg-[rgba(255,255,255,0.1)]"></div>
                
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Statusas</span>
                  <span className="font-bold text-sm" style={{ color: statusColor }}>
                    {isExpiring ? 'Liko 2 dienos (Grąžinimui)' : `Galioja dar 18 mėn.`}
                  </span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      <button className="glass border-dashed border-[rgba(255,255,255,0.3)] rounded-2xl p-6 text-center text-[var(--text-muted)] hover:text-white hover:border-white transition-colors flex flex-col items-center gap-2 mt-2">
        <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <span className="font-medium">Skenuoti naują garantinį čekį</span>
      </button>

    </div>
  );
}
