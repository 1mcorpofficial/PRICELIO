import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { apiRequest } from '../../lib/http';
import { useI18n } from '../../i18n';

type ReceiptRow = {
  receipt_id: string;
  status: string;
  created_at: string;
  confidence: number | null;
  total: number | null;
};

function toReadableStatus(status: string): string {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'processed') return 'Processed';
  if (normalized === 'finalized') return 'Finalized';
  if (normalized === 'needs_confirmation') return 'Needs review';
  return status || '-';
}

export function ReceiptsPage() {
  const t = useI18n((state) => state.t);
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiRequest<ReceiptRow[]>('/me/receipts/history?limit=12')
      .then((payload) => {
        setRows(payload);
        setError('');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load receipts');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <h2>{t('app_receipts_title')}</h2>
      {loading ? <SkeletonRows rows={4} /> : null}
      {!loading && error ? <p className="error-line">{error}</p> : null}
      {!loading && !error && !rows.length ? (
        <EmptyState
          icon="🧾"
          title={t('app_empty_receipts_title')}
          description={t('app_empty_receipts_text')}
        />
      ) : null}
      <div className="list-grid">
        {rows.map((row) => (
          <article key={row.receipt_id} className="list-item list-item--receipt">
            <div>
              <strong>{row.receipt_id.slice(0, 8)}</strong>
              <small>{toReadableStatus(row.status)}</small>
            </div>
            <div>
              <small>Confidence</small>
              <strong>{row.confidence != null ? `${Math.round(row.confidence * 100)}%` : '-'}</strong>
            </div>
            <div>
              <small>Total</small>
              <strong>{row.total != null ? `${Number(row.total).toFixed(2)} EUR` : '-'}</strong>
            </div>
          </article>
        ))}
      </div>

      {!loading && !error && rows.length ? (
        <div className="soft-link-row">
          <Link to="/app/budget" className="inline-link">Open budget analytics</Link>
        </div>
      ) : null}
    </Card>
  );
}
