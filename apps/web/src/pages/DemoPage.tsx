import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { trackUiEvent } from '../lib/analytics';
import { API_BASE } from '../lib/env';
import { useI18n } from '../i18n';

type ScanPhase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

interface LineItem {
  name: string;
  price?: number | null;
  total_price?: number | null;
  quantity?: number | null;
}

export function DemoPage() {
  const t = useI18n((state) => state.t);
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const fetchReport = async (receiptId: string) => {
    try {
      const res = await fetch(`${API_BASE}/receipts/${receiptId}/report`);
      if (!res.ok) return;
      const data = await res.json() as { line_items?: LineItem[]; savings_total?: number };
      const lineItems: LineItem[] = Array.isArray(data.line_items) ? data.line_items : [];
      setItems(lineItems);
      const calcTotal = lineItems.reduce((sum, it) => {
        const p = Number(it.total_price ?? it.price ?? 0);
        return sum + p;
      }, 0);
      setTotal(calcTotal > 0 ? calcTotal : null);
    } catch { /* ignore */ }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setItems([]);
    setTotal(null);
    setErrorMsg('');
    setPhase('uploading');

    try {
      const form = new FormData();
      form.append('file', file);

      const uploadRes = await fetch(`${API_BASE}/receipts/upload`, { method: 'POST', body: form });
      if (!uploadRes.ok) throw new Error('upload_failed');
      const uploadData = await uploadRes.json() as { receipt_id?: string; id?: string };
      const receiptId = uploadData.receipt_id ?? uploadData.id;
      if (!receiptId) throw new Error('no_receipt_id');

      await trackUiEvent('demo_scan_click');
      setPhase('processing');

      // Poll status until done
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`${API_BASE}/receipts/${receiptId}/status`);
          if (!statusRes.ok) return;
          const statusData = await statusRes.json() as { status?: string };
          const s = String(statusData.status || '').toLowerCase();
          if (s === 'processed' || s === 'finalized' || s === 'needs_confirmation') {
            stopPolling();
            await fetchReport(receiptId);
            setPhase('done');
            setOpen(true);
            await trackUiEvent('demo_micro_win_seen');
          } else if (s === 'failed') {
            stopPolling();
            setPhase('error');
            setErrorMsg('Nepavyko nuskaityti kvito. Bandykite dar kartą.');
          }
        } catch { /* retry next tick */ }
      }, 2000);
    } catch {
      setPhase('error');
      setErrorMsg('Įvyko klaida įkeliant nuotrauką. Bandykite dar kartą.');
    }
  };

  const reset = () => {
    stopPolling();
    setPhase('idle');
    setPreview(null);
    setItems([]);
    setTotal(null);
    setErrorMsg('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const busy = phase === 'uploading' || phase === 'processing';

  return (
    <main className="page-shell">
      <Card className="demo-card">
        <h1>{t('demo_title')}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Nufotografuokite tikrą kvitą — sistema atpažins prekes ir kainas.
        </p>

        {/* Camera capture trigger */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />

        {/* Image preview */}
        {preview && (
          <div style={{ margin: '1rem 0', borderRadius: 12, overflow: 'hidden', position: 'relative', maxHeight: 260 }}>
            <img src={preview} alt="Receipt preview" style={{ width: '100%', objectFit: 'cover', borderRadius: 12 }} />
            {busy && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,3,18,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div className="demo-scan-laser is-active" aria-hidden="true" style={{ position: 'static', width: '80%' }} />
                <div style={{ color: 'var(--accent-blue)', fontWeight: 700, fontSize: '0.9rem' }}>
                  {phase === 'uploading' ? 'Įkeliama…' : 'Analizuojama…'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Placeholder when no photo */}
        {!preview && (
          <div
            style={{ margin: '1rem 0', border: '2px dashed rgba(0,240,255,0.25)', borderRadius: 12, padding: '2.5rem 1rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(0,240,255,0.03)' }}
            onClick={() => fileRef.current?.click()}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📷</div>
            <div style={{ color: 'var(--accent-blue)', fontWeight: 600, fontSize: '0.9rem' }}>
              Spustelėkite, kad padarytumėte nuotrauką
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.3rem' }}>
              arba pasirinkite iš galerijos
            </div>
          </div>
        )}

        {/* Extracted items */}
        {phase === 'done' && items.length > 0 && (
          <div style={{ margin: '0.75rem 0', background: 'rgba(0,240,255,0.05)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '0.6rem 1rem', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              Atpažintos prekės
            </div>
            {items.slice(0, 10).map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.55rem 1rem', borderBottom: i < Math.min(items.length, 10) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none', fontSize: '0.87rem' }}>
                <span style={{ flex: 1, marginRight: '0.5rem' }}>{it.name}</span>
                {(it.total_price != null || it.price != null) && (
                  <span style={{ color: 'var(--accent-green)', fontWeight: 700, flexShrink: 0 }}>
                    €{Number(it.total_price ?? it.price).toFixed(2)}
                  </span>
                )}
              </div>
            ))}
            {items.length > 10 && (
              <div style={{ padding: '0.4rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                + dar {items.length - 10} prekių
              </div>
            )}
            {total != null && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 1rem', borderTop: '2px solid rgba(0,240,255,0.15)', fontWeight: 700 }}>
                <span>Viso</span>
                <span style={{ color: 'var(--accent-blue)' }}>€{total.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button glow disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? (phase === 'uploading' ? 'Įkeliama…' : 'Analizuojama…') : phase === 'done' ? 'Nuskaityti kitą' : 'Nufotografuoti kvitą'}
          </Button>
          {(preview || phase !== 'idle') && !busy && (
            <Button variant="ghost" onClick={reset}>Pradėti iš naujo</Button>
          )}
        </div>

        {errorMsg && <p className="error-line" style={{ marginTop: '0.5rem' }}>{errorMsg}</p>}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Kvitas nuskaitytas! 🎉">
        <p>Sistema atpažino {items.length} prekę(-ių) iš jūsų kvito.</p>
        <p>{t('demo_claim_prompt')}</p>
        <Link to="/auth"><Button glow>{t('demo_claim_cta')}</Button></Link>
      </Modal>
    </main>
  );
}
