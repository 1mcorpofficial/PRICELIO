import { FormEvent, useCallback, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { apiRequest } from '../../lib/http';

type SearchProduct = {
  product_id: string;
  name: string;
  best_price: number | null;
  store_chain: string | null;
  updated_at?: string;
};

type ProductOffer = {
  price: number;
  store_name: string;
  store: string | null;
};

function money(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '-';
  return `${Number(value).toFixed(2)} EUR`;
}

export function MarketPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [selected, setSelected] = useState<SearchProduct | null>(null);
  const [offers, setOffers] = useState<ProductOffer[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [error, setError] = useState('');
  const [alertTarget, setAlertTarget] = useState('');
  const [alertStatus, setAlertStatus] = useState('');
  const [creatingAlert, setCreatingAlert] = useState(false);

  const loadOffers = useCallback(async (product: SearchProduct): Promise<void> => {
    setLoadingOffers(true);
    setError('');
    setSelected(product);
    try {
      const payload = await apiRequest<ProductOffer[]>(`/products/${product.product_id}/prices`);
      const normalized = payload
        .map((item) => ({
          price: Number(item.price),
          store_name: String(item.store_name || item.store || 'Store'),
          store: item.store || null
        }))
        .filter((item) => Number.isFinite(item.price))
        .sort((a, b) => a.price - b.price);
      setOffers(normalized);
      const best = normalized[0]?.price;
      setAlertTarget(best != null ? (best * 0.95).toFixed(2) : '');
    } catch (err) {
      setOffers([]);
      setError(err instanceof Error ? err.message : 'Nepavyko gauti kainų');
    } finally {
      setLoadingOffers(false);
    }
  }, []);

  const runSearch = useCallback(async (): Promise<void> => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setError('Įvesk bent 2 simbolius paieškai');
      return;
    }

    setLoadingSearch(true);
    setError('');
    setAlertStatus('');

    try {
      const payload = await apiRequest<SearchProduct[]>(`/search?q=${encodeURIComponent(trimmed)}&limit=20`);
      setResults(payload);
      if (payload.length) {
        await loadOffers(payload[0]);
      } else {
        setSelected(null);
        setOffers([]);
      }
    } catch (err) {
      setResults([]);
      setSelected(null);
      setOffers([]);
      setError(err instanceof Error ? err.message : 'Paieška nepavyko');
    } finally {
      setLoadingSearch(false);
    }
  }, [loadOffers, query]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runSearch();
  };

  const stats = useMemo(() => {
    if (!offers.length) {
      return {
        best: null,
        avg: null,
        worst: null,
        chartPoints: ''
      };
    }

    const prices = offers.map((offer) => offer.price);
    const best = Math.min(...prices);
    const worst = Math.max(...prices);
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    const range = Math.max(0.0001, worst - best);
    const chartPoints = offers
      .map((offer, index) => {
        const x = offers.length === 1 ? 50 : (index / (offers.length - 1)) * 100;
        const y = 100 - (((offer.price - best) / range) * 80 + 10);
        return `${x},${y}`;
      })
      .join(' ');

    return { best, avg, worst, chartPoints };
  }, [offers]);

  const createPriceAlert = async (): Promise<void> => {
    if (!selected) return;
    const target = Number(alertTarget.replace(',', '.'));
    if (!Number.isFinite(target) || target <= 0) {
      setAlertStatus('Neteisinga tikslinė kaina');
      return;
    }

    setCreatingAlert(true);
    setAlertStatus('');
    try {
      await apiRequest('/alerts/price', {
        method: 'POST',
        body: {
          productId: selected.product_id,
          targetPrice: target
        }
      });
      setAlertStatus(`Pranešimas sukurtas: ${selected.name} <= ${target.toFixed(2)} EUR`);
    } catch (err) {
      setAlertStatus(err instanceof Error ? err.message : 'Nepavyko sukurti pranešimo');
    } finally {
      setCreatingAlert(false);
    }
  };

  return (
    <Card>
      <h2>Kainų Analizė</h2>

      <form onSubmit={onSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ieškok prekės (pvz. sviestas)"
        />
        <Button type="submit" disabled={loadingSearch}>
          {loadingSearch ? 'Ieškau…' : 'Ieškoti'}
        </Button>
      </form>

      {error ? <p className="error-line" style={{ marginTop: '0.75rem' }}>{error}</p> : null}

      {!loadingSearch && results.length ? (
        <div className="list-grid" style={{ marginTop: '0.75rem' }}>
          {results.map((item) => (
            <button
              key={item.product_id}
              type="button"
              className="list-item"
              onClick={() => void loadOffers(item)}
              style={{ textAlign: 'left' }}
            >
              <strong>{item.name}</strong>
              <small>{money(item.best_price)} · {item.store_chain || 'Store'}</small>
            </button>
          ))}
        </div>
      ) : null}

      {!loadingSearch && !results.length && !selected ? (
        <div style={{ marginTop: '1rem' }}>
          <EmptyState
            icon="📈"
            title="Rinkos duomenys"
            description="Įvesk prekės pavadinimą ir pamatysi gyvas kainas pagal parduotuves."
          />
        </div>
      ) : null}

      {selected ? (
        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
          <div className="kpi-grid">
            <div>
              <small>Prekė</small>
              <strong>{selected.name}</strong>
            </div>
            <div>
              <small>Geriausia</small>
              <strong>{money(stats.best)}</strong>
            </div>
            <div>
              <small>Vidurkis</small>
              <strong>{money(stats.avg)}</strong>
            </div>
            <div>
              <small>Brangiausia</small>
              <strong>{money(stats.worst)}</strong>
            </div>
          </div>

          {loadingOffers ? <p>Kraunamos kainos…</p> : null}

          {!loadingOffers && offers.length > 1 ? (
            <div className="list-item" style={{ paddingBottom: '1rem' }}>
              <small>Kainų pasiskirstymas</small>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '180px', marginTop: '0.5rem' }} preserveAspectRatio="none">
                <polyline
                  points={stats.chartPoints}
                  fill="none"
                  stroke="var(--accent-blue)"
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          ) : null}

          {!loadingOffers && offers.length ? (
            <div className="list-grid">
              {offers.map((offer, index) => (
                <article key={`${offer.store_name}-${index}`} className="list-item list-item--receipt">
                  <div>
                    <strong>{offer.store_name}</strong>
                    <small>{offer.store || '-'}</small>
                  </div>
                  <div>
                    <small>Eilė</small>
                    <strong>#{index + 1}</strong>
                  </div>
                  <div>
                    <small>Kaina</small>
                    <strong>{money(offer.price)}</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'center' }}>
            <Input
              value={alertTarget}
              onChange={(event) => setAlertTarget(event.target.value)}
              placeholder="Tikslinė kaina"
            />
            <Button variant="outline" onClick={() => void createPriceAlert()} disabled={creatingAlert || !selected}>
              {creatingAlert ? 'Kuriu…' : 'Kurti Alert'}
            </Button>
          </div>
          {alertStatus ? <p>{alertStatus}</p> : null}
        </div>
      ) : null}
    </Card>
  );
}
