import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { trackUiEvent } from '../lib/analytics';
import { useI18n } from '../i18n';

export function LandingPage() {
  const t = useI18n((state) => state.t);
  const lang = useI18n((state) => state.lang);
  const setLang = useI18n((state) => state.setLang);

  // Future integration: fetch these stats from real API. Defaulting to 0 for honesty.
  const usersCount = 0;
  const receiptCount = 0;
  const savingsCount = 0;

  useEffect(() => {
    void trackUiEvent('lp_viewed');
  }, []);

  const stats = useMemo(() => ([
    { value: usersCount.toLocaleString(), label: t('stats_users') },
    { value: `${receiptCount.toLocaleString()}`, label: t('stats_receipts') },
    { value: `€${savingsCount.toLocaleString()}`, label: t('stats_saved') }
  ]), [usersCount, receiptCount, savingsCount, t]);

  return (
    <main className="landing-page">
      <a href="#hero-section" className="skip-link">Skip to main content</a>
      <header className="landing-nav glass">
        <div className="landing-brand">{t('brand')}</div>
        <div className="landing-nav__actions">
          <select value={lang} onChange={(event) => setLang(event.target.value as 'lt' | 'en')} aria-label={t('lang_label')}>
            <option value="lt">LT</option>
            <option value="en">EN</option>
          </select>
          <Link to="/demo" className="inline-link">{t('nav_demo')}</Link>
          <Link to="/auth" className="inline-link">{t('nav_login')}</Link>
          <Link to="/auth"><Button variant="outline">{t('nav_register')}</Button></Link>
        </div>
      </header>

      <section className="hero glass" id="hero-section">
        <div>
          <Badge>{t('hero_badge_live')}</Badge>
          <h1>{t('hero_title')}</h1>
          <p>{t('hero_sub')}</p>
          <div className="hero-cta-row">
            <Link to="/demo" onClick={() => void trackUiEvent('lp_try_demo_click')}>
              <Button glow>{t('hero_cta')}</Button>
            </Link>
            <Link to="/app/overview">
              <Button variant="ghost">{t('hero_secondary_cta')}</Button>
            </Link>
          </div>
        </div>
        <div className="hero-card-visual" aria-hidden="true">
          <div className="hero-card-3d">
            <div className="hero-card-3d__label">PRICELIO</div>
            <div className="hero-card-3d__progress">
              <span />
            </div>
            <div style={{ display: 'grid', gap: '4px', textAlign: 'center', marginTop: '0.5rem' }}>
              <div style={{ color: 'var(--accent-blue)', fontSize: '1.2rem' }}>{t('hero_card_amount' as any)}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>{t('hero_card_accuracy' as any)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-bento" style={{ marginTop: '2rem' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>{t('why_title' as any)}</h2>
        <p className="muted" style={{ textAlign: 'center', marginBottom: '2rem' }}>{t('why_text' as any)}</p>
        <div className="bento-grid">
           <Card className="glass" style={{ borderTop: '2px solid var(--accent-blue)', boxShadow: '0 8px 32px rgba(0, 240, 255, 0.1)' }}>
             <h4 style={{ color: 'var(--accent-blue)', margin: 0 }}>1. {t('how_step_1' as any)}</h4>
             <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{t('onboarding_1')}</p>
           </Card>
           <Card className="glass" style={{ borderTop: '2px solid var(--accent-pink)', boxShadow: '0 8px 32px rgba(255, 0, 122, 0.1)' }}>
             <h4 style={{ color: 'var(--accent-pink)', margin: 0 }}>2. {t('how_step_2' as any)}</h4>
             <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{t('onboarding_2')}</p>
           </Card>
           <Card className="glass" style={{ borderTop: '2px solid var(--accent-red)', boxShadow: '0 8px 32px rgba(255, 0, 60, 0.1)' }}>
             <h4 style={{ color: 'var(--accent-red)', margin: 0 }}>3. {t('how_step_3' as any)}</h4>
             <p className="muted" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{t('onboarding_3')}</p>
           </Card>
        </div>
      </section>

      <section className="landing-grid" style={{ marginTop: '2rem' }}>
        <Card>
          <h3>{t('problem_title')}</h3>
          <p>{t('problem_text')}</p>
          <div className="landing-tag-row">
            <span className="landing-tag">XP</span>
            <span className="landing-tag">Missions</span>
            <span className="landing-tag">Realtime</span>
          </div>
        </Card>
        <Card>
          <h3>{t('proof_title')}</h3>
          <p>{t('proof_text')}</p>
          <div className="proof-bars">
            <div><small>Receipt pipeline</small><span style={{ width: '88%' }} /></div>
            <div><small>Mission consensus</small><span style={{ width: '72%' }} /></div>
            <div><small>XP event stream</small><span style={{ width: '94%' }} /></div>
          </div>
        </Card>
      </section>

      <Card className="social-card" style={{ marginTop: '2rem' }}>
        <h3>{t('social_title')}</h3>
        <p>{t('social_text')}</p>
        <div className="social-metrics">
          {stats.map((stat) => (
            <article key={stat.label} className="social-metric">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-blue)', boxShadow: '0 0 8px var(--accent-blue)' }} />
                <strong>{stat.value}</strong>
              </div>
              <small>{stat.label}</small>
            </article>
          ))}
        </div>
      </Card>

      <footer className="landing-footer">
        <div className="landing-footer__brand">
          <div className="landing-brand" style={{ marginBottom: '1rem' }}>{t('brand')}</div>
          <p className="muted" style={{ fontSize: '0.85rem', maxWidth: '300px' }}>
            {t('problem_text')}
          </p>
        </div>
        <div className="landing-footer__links">
          <div className="landing-footer__column">
            <strong>{t('footer_product' as any)}</strong>
            <Link to="/demo" className="muted">{t('nav_demo')}</Link>
            <Link to="/auth" className="muted">{t('nav_login')}</Link>
          </div>
          <div className="landing-footer__column">
            <strong>{t('footer_company' as any)}</strong>
            <a href="#" onClick={(e) => e.preventDefault()} className="muted">About</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="muted">Contact</a>
          </div>
          <div className="landing-footer__column">
            <strong>{t('footer_legal' as any)}</strong>
            <a href="#" onClick={(e) => e.preventDefault()} className="muted">Privacy</a>
            <a href="#" onClick={(e) => e.preventDefault()} className="muted">Terms</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
