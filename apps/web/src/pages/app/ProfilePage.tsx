import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useGamificationStore } from '../../stores/gamificationStore';
import clsx from 'clsx';

// Demo duomenys lyderių lentelėms
const topHoarders = [
  { id: 1, name: 'Mantas P.', rank: 'Rinkos Medžiotojas', xp: 45200, avatar: 'M', color: 'var(--accent-blue)' },
  { id: 2, name: 'Aistė G.', rank: 'Kainų Architektė', xp: 38100, avatar: 'A', color: 'var(--accent-pink)' },
  { id: 3, name: 'Tomas L.', rank: 'Taupymo Guru', xp: 32500, avatar: 'T', color: 'var(--accent-green)' },
];

const topWhales = [
  { id: 1, name: 'Dominykas V.', spent: 150000, plan: 'Family (Metinis)', avatar: 'D', color: 'var(--accent-red)' },
  { id: 2, name: 'Laura K.', spent: 85000, plan: 'Duo', avatar: 'L', color: '#FFB800' },
  { id: 3, name: 'Studentų Atstovybė', spent: 60000, plan: 'Group Admin', avatar: 'S', color: 'var(--accent-blue)' },
];

export function ProfilePage() {
  const user = useAuthStore((state) => state.session.user);
  const profile = useGamificationStore((state) => state.profile);
  const [activeTab, setActiveTab] = useState<'hoarders' | 'whales'>('hoarders');

  // Išgauname pirmą vardo raidę avatarui
  const initial = user?.email?.charAt(0).toUpperCase() || 'G';
  
  // 12.5k XP demo tikslais (kaip aptarta dizaine)
  const currentXP = profile?.lifetime_xp || 12500;
  const progressPercent = 75; // 75% iki kito lygio

  return (
    <div className="profile-container flex flex-col gap-6 pb-[100px]">
      
      {/* 1. Asmeninė Vitrina (Hero Section) */}
      <div className="glass rounded-3xl p-6 flex flex-col items-center text-center relative overflow-hidden bg-[rgba(30,15,50,0.6)] border-[rgba(255,255,255,0.1)] shadow-soft mt-2">
        <div className="absolute top-0 left-0 w-full h-32 bg-[linear-gradient(180deg,rgba(0,240,255,0.15),transparent)]"></div>
        
        {/* Avataras su neoniniu žiedu */}
        <div className="relative mb-4">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100" style={{ transform: 'scale(1.2) rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent-blue)" strokeWidth="4" 
              strokeDasharray={`${(progressPercent * 283) / 100} 283`}
              style={{ filter: 'drop-shadow(0 0 6px var(--accent-blue))' }}
            />
          </svg>
          <div className="w-24 h-24 rounded-full bg-[var(--bg-surface)] border-2 border-[var(--bg-elevated)] flex items-center justify-center text-3xl font-bold z-10 relative">
            {initial}
          </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-1">{user?.email?.split('@')[0] || 'Svečias'}</h2>
        <div className="text-[var(--accent-blue)] font-bold text-sm tracking-widest uppercase mb-4 shadow-glow">
          LYGIS 14: RINKOS MEDŽIOTOJAS
        </div>

        <div className="flex flex-col items-center">
          <div className="text-[var(--text-muted)] text-sm mb-1">XP Piniginė</div>
          <div className="text-4xl font-black bg-clip-text text-transparent bg-[linear-gradient(90deg,#fff,var(--text-muted))]">
            {currentXP.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 2. XP Dilemos Zona (Leisti ar Kaupti?) */}
      <div className="grid grid-cols-2 gap-4">
        <button className="glass rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-[rgba(255,255,255,0.05)] transition-all">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span className="font-bold text-sm">Kilti Lygiais</span>
          <span className="text-xs text-[var(--text-muted)]">Trūksta 2,500 XP</span>
        </button>

        <button className="glass rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-[rgba(255,0,122,0.1)] transition-all border-[rgba(255,0,122,0.2)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-pink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span className="font-bold text-sm text-[var(--accent-pink)]">Išleisti XP</span>
          <span className="text-xs text-[var(--text-muted)]">Apmokėti PRO</span>
        </button>
      </div>

      {/* 3. Dvigubos Lyderių Lentelės */}
      <div className="glass rounded-3xl overflow-hidden mt-2">
        <div className="flex border-b border-[rgba(255,255,255,0.1)]">
          <button 
            className={clsx("flex-1 py-4 font-bold text-sm transition-colors relative", activeTab === 'hoarders' ? "text-white" : "text-[var(--text-muted)]")}
            onClick={() => setActiveTab('hoarders')}
          >
            TOP KAUPIKAI
            {activeTab === 'hoarders' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[var(--accent-blue)] shadow-[0_0_10px_var(--accent-blue)]"></div>}
          </button>
          <button 
            className={clsx("flex-1 py-4 font-bold text-sm transition-colors relative", activeTab === 'whales' ? "text-white" : "text-[var(--text-muted)]")}
            onClick={() => setActiveTab('whales')}
          >
            🔥 TOP BANGINIAI
            {activeTab === 'whales' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[var(--accent-red)] shadow-[0_0_10px_var(--accent-red)]"></div>}
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {activeTab === 'hoarders' ? (
            topHoarders.map((user, i) => (
              <div key={user.id} className="flex items-center gap-4 bg-[rgba(0,0,0,0.2)] p-3 rounded-xl">
                <div className="font-bold text-[var(--text-muted)] w-4 text-center">{i + 1}</div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: user.color }}>{user.avatar}</div>
                <div className="flex-1">
                  <div className="font-bold">{user.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{user.rank}</div>
                </div>
                <div className="font-black text-[var(--accent-blue)]">{user.xp.toLocaleString()} XP</div>
              </div>
            ))
          ) : (
            topWhales.map((user, i) => (
              <div key={user.id} className="flex items-center gap-4 bg-[rgba(255,0,60,0.05)] border border-[rgba(255,0,60,0.1)] p-3 rounded-xl">
                <div className="font-bold text-[var(--accent-red)] w-4 text-center">{i + 1}</div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: user.color }}>{user.avatar}</div>
                <div className="flex-1">
                  <div className="font-bold">{user.name}</div>
                  <div className="text-xs text-[var(--text-muted)]">{user.plan}</div>
                </div>
                <div className="font-black text-[var(--accent-red)]">-{user.spent.toLocaleString()} XP</div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
