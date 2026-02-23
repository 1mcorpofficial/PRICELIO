import clsx from 'clsx';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n';

const tabs = [
  { to: '/app/overview', key: 'app_overview', icon: '🏠' },
  { to: '/app/receipts', key: 'app_receipts', icon: '🧾' },
  { to: '/app/missions', key: 'app_missions', icon: '🎯' },
  { to: '/app/budget', key: 'app_budget', icon: '📊' },
  { to: '/app/profile', key: 'app_profile', icon: '👤' }
] as const;

export function BottomTabBar() {
  const location = useLocation();
  const t = useI18n((state) => state.t);

  return (
    <nav className="bottom-tabbar" aria-label="Bottom navigation">
      {tabs.map((tab) => {
        const active = location.pathname.startsWith(tab.to);
        const isCenter = tab.key === 'app_missions';
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={clsx('bottom-tabbar__item', active && 'is-active', isCenter && 'is-center')}
          >
            <span>{tab.icon}</span>
            <small>{t(tab.key)}</small>
          </Link>
        );
      })}
    </nav>
  );
}
