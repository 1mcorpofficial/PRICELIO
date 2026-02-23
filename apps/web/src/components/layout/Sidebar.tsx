import clsx from 'clsx';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n';

const items = [
  { to: '/app/overview', key: 'app_overview', icon: '🏠' },
  { to: '/app/receipts', key: 'app_receipts', icon: '🧾' },
  { to: '/app/budget', key: 'app_budget', icon: '📊' },
  { to: '/app/missions', key: 'app_missions', icon: '🎯' },
  { to: '/app/basket', key: 'app_basket', icon: '🛒' },
  { to: '/app/family', key: 'app_family', icon: '👨‍👩‍👧' },
  { to: '/app/leaderboard', key: 'app_leaderboard', icon: '🏆' },
  { to: '/app/plus', key: 'app_plus', icon: '⭐' },
  { to: '/app/kids', key: 'app_kids', icon: '👶' },
  { to: '/app/profile', key: 'app_profile', icon: '👤' }
] as const;

export function Sidebar() {
  const location = useLocation();
  const t = useI18n((state) => state.t);

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar__brand">PRICELIO</div>
      <nav className="app-sidebar__nav">
        {items.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={clsx('app-sidebar__link', location.pathname.startsWith(item.to) && 'is-active')}
          >
            <span aria-hidden="true">{item.icon}</span>
            {t(item.key)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
