import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { useI18n } from '../../i18n';

// Ikonos meniu punktams
const KidsIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const PantryIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16v16H4z" />
    <path d="M4 12h16" />
    <path d="M12 4v16" />
  </svg>
);

const FamilyIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const menuItems = [
  { path: '/app/kids', title: 'Kids Space', desc: 'Vaikų erdvė ir misijos', icon: <KidsIcon />, color: 'var(--accent-pink)' },
  { path: '/app/warranty', title: 'Warranty Vault', desc: 'Garantijų ir čekių seifas', icon: <ShieldIcon />, color: 'var(--accent-blue)' },
  { path: '/app/pantry', title: 'Smart Pantry', desc: 'Namų spintelė ir likučiai', icon: <PantryIcon />, color: 'var(--accent-green)' },
  { path: '/app/family', title: 'Family Hub', desc: 'Šeimos biudžetas ir išlaidos', icon: <FamilyIcon />, color: '#FFB800' },
  { path: '/app/settings', title: 'AI Profiling', desc: 'Dietų filtrai ir asistentas', icon: <SettingsIcon />, color: 'var(--text-muted)' },
];

export function MorePage() {
  const t = useI18n((state) => state.t);

  return (
    <div className="more-menu-container">
      <h2 className="text-2xl font-bold mb-6 mt-4 ml-2">Daugiau įrankių</h2>
      <div className="bubbles-grid">
        {menuItems.map((item, i) => (
          <Link 
            to={item.path} 
            key={item.path} 
            className="bubble-card glass"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="bubble-icon" style={{ color: item.color, borderColor: item.color, boxShadow: `0 0 15px ${item.color}40` }}>
              {item.icon}
            </div>
            <div className="bubble-info">
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
            <div className="bubble-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
