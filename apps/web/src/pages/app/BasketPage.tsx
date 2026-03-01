import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { apiRequest, ApiError } from '../../lib/http';

type SearchHit = {
  product_id: string;
  name: string;
  best_price: number | null;
  store_chain: string | null;
};

type BasketItem = {
  id: string;
  quantity: number;
  raw_name: string | null;
  product_id: string | null;
  product_name: string;
};

type BasketCreateResponse = {
  id: string;
  guest_proof?: string | null;
};

type BasketItemsResponse = {
  id: string;
  items: BasketItem[];
};

type BasketPlanItem = {
  product_id: string | null;
  product_name: string;
  price: number;
  line_total: number;
  quantity: number;
};

type BasketOptimization = {
  total_price: number;
  savings_eur: number;
  plan: Array<{
    store_name: string;
    items: BasketPlanItem[];
  }>;
  missing_items: string[];
};

type ActiveBasket = {
  id: string;
  guestProof: string | null;
};

const BASKET_STORAGE_KEY = 'pricelio_active_basket';

function readBasketFromStorage(): ActiveBasket | null {
  try {
    const raw = window.localStorage.getItem(BASKET_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: unknown; guestProof?: unknown };
    const id = String(parsed.id || '').trim();
    if (!id) return null;
    return {
      id,
      guestProof: parsed.guestProof ? String(parsed.guestProof) : null
    };
  } catch {
    return null;
  }
}

function persistBasket(activeBasket: ActiveBasket | null): void {
  if (!activeBasket) {
    window.localStorage.removeItem(BASKET_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(BASKET_STORAGE_KEY, JSON.stringify(activeBasket));
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function basketHeaders(guestProof: string | null): Record<string, string> {
  if (!guestProof) return {};
  return { 'x-guest-session-proof': guestProof };
}

export function BasketPage() {
  const [basket, setBasket] = useState<ActiveBasket | null>(null);
  const [items, setItems] = useState<BasketItem[]>([]);
  const [optimization, setOptimization] = useState<BasketOptimization | null>(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchHit[]>([]);
  const [loadingBasket, setLoadingBasket] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [adding, setAdding] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState('');

  const createBasket = useCallback(async (): Promise<ActiveBasket | null> => {
    try {
      const payload = await apiRequest<BasketCreateResponse>('/baskets', {
        method: 'POST',
        body: { name: 'Main basket' }
      });
      const next: ActiveBasket = {
        id: String(payload.id),
        guestProof: payload.guest_proof ? String(payload.guest_proof) : null
      };
      persistBasket(next);
      setBasket(next);
      return next;
    } catch (err) {
      setError(toErrorMessage(err, 'Nepavyko sukurti krepšelio'));
      return null;
    }
  }, []);

  const optimizeBasket = useCallback(async (activeBasket: ActiveBasket): Promise<void> => {
    try {
      setOptimizing(true);
      const payload = await apiRequest<BasketOptimization>(`/baskets/${activeBasket.id}/optimize`, {
        method: 'POST',
        body: {},
        headers: basketHeaders(activeBasket.guestProof)
      });
      setOptimization(payload);
      setItems((current) => {
        if (current.length) return current;
        const planItems = payload.plan?.[0]?.items || [];
        return planItems.map((item, index) => ({
          id: `plan-${index}`,
          quantity: Number(item.quantity || 1),
          raw_name: item.product_name,
          product_id: item.product_id,
          product_name: item.product_name
        }));
      });
    } catch (err) {
      setError(toErrorMessage(err, 'Nepavyko optimizuoti krepšelio'));
    } finally {
      setOptimizing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      setLoadingBasket(true);
      setError('');
      const fromStorage = readBasketFromStorage();
      if (fromStorage) {
        if (!mounted) return;
        setBasket(fromStorage);
        await optimizeBasket(fromStorage);
        if (mounted) setLoadingBasket(false);
        return;
      }

      const created = await createBasket();
      if (created) {
        await optimizeBasket(created);
      }
      if (mounted) setLoadingBasket(false);
    };

    void boot();

    return () => {
      mounted = false;
    };
  }, [createBasket, optimizeBasket]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      return;
    }

    let cancelled = false;
    setLoadingSuggestions(true);

    const timer = window.setTimeout(() => {
      apiRequest<SearchHit[]>(`/search?q=${encodeURIComponent(trimmed)}&limit=8`)
        .then((hits) => {
          if (!cancelled) setSuggestions(hits);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingSuggestions(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const addItem = useCallback(async (hit?: SearchHit) => {
    if (!basket) {
      setError('Krepšelis dar nekrautas');
      return;
    }

    const raw = hit?.name || query.trim();
    if (!raw) return;

    const payloadItem = hit?.product_id
      ? { product_id: hit.product_id, raw_name: hit.name, quantity: 1 }
      : { raw_name: raw, quantity: 1 };

    try {
      setAdding(true);
      setError('');
      const response = await apiRequest<BasketItemsResponse>(`/baskets/${basket.id}/items`, {
        method: 'POST',
        body: { items: [payloadItem] },
        headers: basketHeaders(basket.guestProof)
      });
      setItems(response.items || []);
      setQuery('');
      setSuggestions([]);
      await optimizeBasket(basket);
    } catch (err) {
      setError(toErrorMessage(err, 'Nepavyko pridėti prekės'));
    } finally {
      setAdding(false);
    }
  }, [basket, optimizeBasket, query]);

  const optimizedLookup = useMemo(() => {
    const map = new Map<string, BasketPlanItem>();
    const planItems = optimization?.plan?.[0]?.items || [];
    for (const item of planItems) {
      if (item.product_id) map.set(`id:${item.product_id}`, item);
      if (item.product_name) map.set(`name:${item.product_name.toLowerCase()}`, item);
    }
    return map;
  }, [optimization]);

  const storeName = optimization?.plan?.[0]?.store_name || '-';
  const totalPrice = optimization?.total_price ?? null;
  const savings = optimization?.savings_eur ?? null;

  return (
    <Card>
      <h2>Išmanus Krepšelis</h2>
      {error ? <p className="error-line">{error}</p> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.5rem', alignItems: 'center' }}>
        <Input
          placeholder="Ieškok prekės (pvz. Dvaro pienas)"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void addItem();
            }
          }}
        />
        <Button variant="outline" onClick={() => basket && optimizeBasket(basket)} disabled={!basket || optimizing || loadingBasket}>
          {optimizing ? 'Skaičiuoju…' : 'Optimizuoti'}
        </Button>
        <Button onClick={() => void addItem()} disabled={!basket || adding || !query.trim()}>
          {adding ? 'Dedu…' : 'Pridėti'}
        </Button>
      </div>

      {loadingSuggestions ? <p style={{ marginTop: '0.5rem' }}>Ieškoma…</p> : null}
      {!loadingSuggestions && suggestions.length ? (
        <div className="list-grid" style={{ marginTop: '0.75rem' }}>
          {suggestions.map((hit) => (
            <button
              key={hit.product_id}
              type="button"
              className="list-item"
              onClick={() => void addItem(hit)}
              style={{ textAlign: 'left' }}
            >
              <strong>{hit.name}</strong>
              <small>
                {hit.best_price != null ? `${Number(hit.best_price).toFixed(2)} EUR` : 'Kaina nepasiekiama'} · {hit.store_chain || 'Store'}
              </small>
            </button>
          ))}
        </div>
      ) : null}

      <div style={{ marginTop: '1rem' }}>
        {loadingBasket ? (
          <p>Kraunamas krepšelis…</p>
        ) : !items.length ? (
          <EmptyState
            icon="🛒"
            title="Krepšelis tuščias"
            description="Pradėk rašyti prekės pavadinimą ir pridėk ją į krepšelį."
          />
        ) : (
          <div className="list-grid">
            {items.map((item) => {
              const optimized = item.product_id
                ? optimizedLookup.get(`id:${item.product_id}`)
                : optimizedLookup.get(`name:${item.product_name.toLowerCase()}`);

              const lineTotal = optimized?.line_total != null ? Number(optimized.line_total).toFixed(2) : '-';
              const unitPrice = optimized?.price != null ? Number(optimized.price).toFixed(2) : '-';

              return (
                <article key={item.id} className="list-item list-item--receipt">
                  <div>
                    <strong>{item.product_name || item.raw_name || 'Prekė'}</strong>
                    <small>{storeName}</small>
                  </div>
                  <div>
                    <small>Kiekis</small>
                    <strong>{item.quantity}x</strong>
                  </div>
                  <div>
                    <small>{unitPrice !== '-' ? `${unitPrice} EUR / vnt.` : 'Kaina nepasiekiama'}</small>
                    <strong>{lineTotal !== '-' ? `${lineTotal} EUR` : '-'}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="kpi-grid" style={{ marginTop: '1rem' }}>
        <div>
          <small>Viso</small>
          <strong>{totalPrice != null ? `${Number(totalPrice).toFixed(2)} EUR` : '-'}</strong>
        </div>
        <div>
          <small>Sutaupoma</small>
          <strong>{savings != null ? `${Number(savings).toFixed(2)} EUR` : '-'}</strong>
        </div>
        <div>
          <small>Parduotuvė</small>
          <strong>{storeName}</strong>
        </div>
        <div>
          <small>Elementai</small>
          <strong>{items.length}</strong>
        </div>
      </div>
    </Card>
  );
}
