import { Outlet } from 'react-router-dom';
import { Sidebar } from '../../components/layout/Sidebar';
import { BottomTabBar } from '../../components/ui/BottomTabBar';
import { OnboardingOverlay } from '../../components/OnboardingOverlay';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { useGamificationStore } from '../../stores/gamificationStore';
import { useRealtimeEvents } from '../../hooks/useRealtimeEvents';
import { useI18n } from '../../i18n';

export function AppLayout() {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.session.user);
  const profile = useGamificationStore((state) => state.profile);
  const t = useI18n((state) => state.t);

  useRealtimeEvents();

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <header className="app-topbar glass">
          <div className="app-topbar__identity">
            <strong>{user?.email || t('app_guest')}</strong>
            <div className="xp-chip">
              <span className="xp-chip__dot" />
              <small>{profile?.lifetime_xp ?? 0} {t('app_xp')}</small>
            </div>
          </div>
          <Button variant="ghost" onClick={() => logout()}>{t('app_logout')}</Button>
        </header>

        <div className="app-content">
          <Outlet />
        </div>
      </div>
      <BottomTabBar />
      <OnboardingOverlay />
    </div>
  );
}
