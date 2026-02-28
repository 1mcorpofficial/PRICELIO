import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { useAuthStore } from '../stores/authStore';
import { useDemoStore } from '../stores/demoStore';
import { useGamificationStore } from '../stores/gamificationStore';
import { useUiStore } from '../stores/uiStore';
import { useI18n } from '../i18n';

export function AuthPage() {
  const t = useI18n((state) => state.t);
  const navigate = useNavigate();
  const location = useLocation();
  const register = useAuthStore((state) => state.register);
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.status) === 'loading';
  const error = useAuthStore((state) => state.error);
  const claimDemo = useDemoStore((state) => state.claimDemo);
  const loadGamification = useGamificationStore((state) => state.load);
  const openOnboarding = useUiStore((state) => state.openOnboarding);

  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<{field: string, message: string} | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setValidationError(null);

    if (!email.includes('@') || !email.includes('.')) {
      setValidationError({ field: 'email', message: t('auth_validation_email') });
      return;
    }
    if (password.length < 8) {
      setValidationError({ field: 'password', message: t('auth_validation_password') });
      return;
    }

    const ok = mode === 'register'
      ? await register({ email, password })
      : await login({ email, password });

    if (!ok) return;

    await claimDemo().catch(() => false);
    await loadGamification();
    openOnboarding();
    const from = (location.state as { from?: string } | null)?.from || '/app/overview';
    navigate(from, { replace: true });
  };

  return (
    <main className="page-shell">
      <div className="auth-layout">
        <Card className="auth-card">
          <h1>{t('auth_title')}</h1>

          <div className="auth-mode-row">
            <Button type="button" variant={mode === 'register' ? 'primary' : 'ghost'} onClick={() => setMode('register')}>
              {t('auth_register')}
            </Button>
            <Button type="button" variant={mode === 'login' ? 'primary' : 'ghost'} onClick={() => setMode('login')}>
              {t('auth_login')}
            </Button>
          </div>

          <div className="social-row">
            <Button variant="outline" disabled>{t('continue_google')}</Button>
            <Button variant="outline" disabled>{t('continue_apple')}</Button>
          </div>

          <form onSubmit={submit} className="auth-form" noValidate>
            <label htmlFor="auth-email">
              {t('email')}
              <Input
                id="auth-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                aria-invalid={validationError?.field === 'email'}
              />
            </label>
            <label htmlFor="auth-password">
              {t('password')}
              <Input
                id="auth-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                aria-invalid={validationError?.field === 'password'}
              />
            </label>

            <Button type="submit" glow disabled={loading}>{loading ? '...' : mode === 'register' ? t('auth_register') : t('auth_login')}</Button>
          </form>

          {validationError ? <p className="error-line">{validationError.message}</p> : null}
          {error ? <p className="error-line">{error}</p> : null}
        </Card>

        <Card className="auth-value-card">
          <h2>{t('proof_title')}</h2>
          <p>{t('proof_text')}</p>
          <div className="auth-value-points">
            <div><strong>+50 XP</strong><small>{t('auth_value_demo_bonus')}</small></div>
            <div><strong>Live SSE</strong><small>{t('auth_value_realtime')}</small></div>
            <div><strong>Secure Auth</strong><small>{t('auth_value_security')}</small></div>
          </div>
        </Card>
      </div>
    </main>
  );
}
