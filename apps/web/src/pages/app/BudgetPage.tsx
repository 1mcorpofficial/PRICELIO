import { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonRows } from '../../components/ui/Skeleton';
import { apiRequest } from '../../lib/http';
import { useI18n } from '../../i18n';

type BudgetPayload = {
  totals?: {
    spent?: number;
    overpaid?: number;
    saved?: number;
    receipts?: number;
  };
};

export function BudgetPage() {
  const t = useI18n((state) => state.t);
  const [data, setData] = useState<BudgetPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiRequest<BudgetPayload>('/me/receipts/analytics?months=12')
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card>
      <h2>{t('app_budget_title')}</h2>
      {loading ? <SkeletonRows rows={4} /> : null}
      {!loading && !data?.totals?.receipts ? (
        <EmptyState
          icon="📊"
          title={t('app_empty_receipts_title')}
          description={t('app_empty_receipts_text')}
        />
      ) : null}
      {!loading && data?.totals?.receipts ? (
        <div className="kpi-grid">
          <div><small>Total</small><strong>{Number(data?.totals?.spent || 0).toFixed(2)} EUR</strong></div>
          <div><small>Overpaid</small><strong>{Number(data?.totals?.overpaid || 0).toFixed(2)} EUR</strong></div>
          <div><small>Saved</small><strong>{Number(data?.totals?.saved || 0).toFixed(2)} EUR</strong></div>
          <div><small>Receipts</small><strong>{Number(data?.totals?.receipts || 0)}</strong></div>
        </div>
      ) : null}
    </Card>
  );
}
