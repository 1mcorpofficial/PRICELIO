import { useMemo, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { trackUiEvent } from '../lib/analytics';
import { useDemoStore } from '../stores/demoStore';
import { useI18n } from '../i18n';

export function DemoPage() {
  const t = useI18n((state) => state.t);
  const status = useDemoStore((state) => state.status);
  const reward = useDemoStore((state) => state.rewardPreview);
  const error = useDemoStore((state) => state.error);
  const startDemo = useDemoStore((state) => state.startDemo);
  const markWin = useDemoStore((state) => state.markWin);
  const [open, setOpen] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const busy = status === 'loading';

  const subtitle = useMemo(() => {
    if (status === 'won') return t('demo_success');
    if (status === 'expired') return t('demo_session_expired');
    return t('demo_sub');
  }, [status, t]);

  return (
    <main className="page-shell">
      <Card className="demo-card">
        <h1>{t('demo_title')}</h1>
        <p>{subtitle}</p>

        <div className="demo-receipt-mock">
          <div className={`demo-scan-laser ${busy ? 'is-active' : ''}`} aria-hidden="true" />
          <div>{t('demo_item_milk' as any)} · €0.99</div>
          <div>{t('demo_item_bread' as any)} · €1.29</div>
          <div>{t('demo_item_cheese' as any)} · €2.49</div>
        </div>

        <Button
          glow
          disabled={busy}
          onClick={async () => {
            const ok = await startDemo();
            if (!ok) return;
            await trackUiEvent('demo_scan_click');
            setTimeout(async () => {
              if (!mountedRef.current) return;
              markWin();
              setOpen(true);
              await trackUiEvent('demo_micro_win_seen');
            }, 900);
          }}
        >
          {busy ? t('scanning_now') : t('demo_scan')}
        </Button>

        {reward ? (
          <p className="muted">
            {t('demo_preview_reward')}: +{reward.xp} XP / +{reward.points}
          </p>
        ) : null}
        {error ? <p className="error-line">{error}</p> : null}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={t('demo_modal_title' as any)}>
        <p>{t('demo_success')}</p>
        <p>{t('demo_claim_prompt')}</p>
        <Link to="/auth"><Button glow>{t('demo_claim_cta')}</Button></Link>
      </Modal>
    </main>
  );
}
