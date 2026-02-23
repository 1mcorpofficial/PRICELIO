import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { trackUiEvent } from '../lib/analytics';
import { useI18n } from '../i18n';

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.floor(target * progress));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

export function LandingPage() {
  const t = useI18n((state) => state.t);
  const lang = useI18n((state) => state.lang);
  const setLang = useI18n((state) => state.setLang);
  const usersCount = useCountUp(10432);
  const receiptCount = useCountUp(218640);
  const savingsCount = useCountUp(12480);

  useEffect(() => {
    void trackUiEvent('lp_viewed');
  }, []);

  const stats = useMemo(() => ([
    { value: usersCount.toLocaleString(), label: t('stats_users') },
    { value: `${receiptCount.toLocaleString()}+`, label: t('stats_receipts') },
    { value: `€${savingsCount.toLocaleString()}`, label: t('stats_saved') }
  ]), [usersCount, receiptCount, savingsCount, t]);

  return (
    <main className="landing-page">
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

      <section className="hero glass">
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
          </div>
        </div>
      </section>

      <section className="landing-grid">
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

      <Card className="social-card">
        <h3>{t('social_title')}</h3>
        <p>{t('social_text')}</p>
        <div className="social-metrics">
          {stats.map((stat) => (
            <article key={stat.label} className="social-metric">
              <strong>{stat.value}</strong>
              <small>{stat.label}</small>
            </article>
          ))}
        </div>
      </Card>
    </main>
  );
}
