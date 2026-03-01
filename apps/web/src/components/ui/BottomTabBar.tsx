import clsx from 'clsx';
import { Link, useLocation } from 'react-router-dom';

// Profesionalių ikonų SVG komponentai (vietoje emoji)
const MoreIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
    <circle cx="5" cy="12" r="1" />
  </svg>
);

const MarketIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const CameraIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="url(#neonGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <defs>
      <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--accent-blue)" />
        <stop offset="100%" stopColor="var(--accent-pink)" />
      </linearGradient>
    </defs>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const BasketIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

type TabItem = {
  to: string;
  key: string;
  icon: JSX.Element;
  isCenter?: boolean;
};

const tabs: TabItem[] = [
  { to: '/app/more', key: 'app_more', icon: <MoreIcon /> },
  { to: '/app/market', key: 'app_market', icon: <MarketIcon /> },
  { to: '/app/scan', key: 'app_scan', icon: <CameraIcon />, isCenter: true },
  { to: '/app/basket', key: 'app_basket', icon: <BasketIcon /> },
  { to: '/app/profile', key: 'app_profile', icon: <ProfileIcon /> }
];

export function BottomTabBar() {
  const location = useLocation();

  return (
    <nav className="bottom-tabbar glass-nav" aria-label="Bottom navigation">
      {tabs.map((tab) => {
        const active = location.pathname.startsWith(tab.to);
        const isCenter = tab.isCenter;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={clsx(
              'bottom-tabbar__item',
              active && 'is-active',
              isCenter && 'is-center',
              isCenter && active && 'is-center-active'
            )}
          >
            <div className={clsx('icon-wrapper', isCenter && 'center-icon-wrapper')}>
              {tab.icon}
            </div>
            {!isCenter && <div className="active-dot" />}
          </Link>
        );
      })}
    </nav>
  );
}
