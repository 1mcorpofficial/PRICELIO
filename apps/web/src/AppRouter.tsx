import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { DemoPage } from './pages/DemoPage';
import { AuthPage } from './pages/AuthPage';
import { AppLayout } from './pages/app/AppLayout';
import { OverviewPage } from './pages/app/OverviewPage';
import { ReceiptsPage } from './pages/app/ReceiptsPage';
import { BudgetPage } from './pages/app/BudgetPage';
import { MissionsPage } from './pages/app/MissionsPage';
import { BasketPage } from './pages/app/BasketPage';
import { ProfilePage } from './pages/app/ProfilePage';
import { FamilyPage } from './pages/app/FamilyPage';
import { LeaderboardPage } from './pages/app/LeaderboardPage';
import { PlusPage } from './pages/app/PlusPage';
import { KidsPage } from './pages/app/KidsPage';
import { MorePage } from './pages/app/MorePage';
import { MarketPage } from './pages/app/MarketPage';
import { WarrantyPage } from './pages/app/WarrantyPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastHost } from './components/ui/ToastHost';
import { useAuthStore } from './stores/authStore';
import { useDemoStore } from './stores/demoStore';

function AppBootstrap() {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const hydrateDemo = useDemoStore((state) => state.hydrate);

  useEffect(() => {
    if (!sessionStorage.getItem('pricelio_session_id')) {
      sessionStorage.setItem('pricelio_session_id', crypto.randomUUID());
    }
    hydrateDemo();
    void bootstrap();
  }, [bootstrap, hydrateDemo]);

  return null;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppBootstrap />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/auth" element={<AuthPage />} />

        <Route
          path="/app"
          element={(
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          )}
        >
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="more" element={<MorePage />} />
          <Route path="market" element={<MarketPage />} />
          <Route path="warranty" element={<WarrantyPage />} />
          <Route path="receipts" element={<ReceiptsPage />} />
          <Route path="budget" element={<BudgetPage />} />
          <Route path="missions" element={<MissionsPage />} />
          <Route path="basket" element={<BasketPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="family" element={<FamilyPage />} />
          <Route path="leaderboard" element={<LeaderboardPage />} />
          <Route path="plus" element={<PlusPage />} />
          <Route path="kids" element={<KidsPage />} />
        </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
      <ToastHost />
    </BrowserRouter>
  );
}
