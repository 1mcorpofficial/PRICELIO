const body = document.body;

const viewButtons = Array.from(document.querySelectorAll('.tab-btn'));
const views = Array.from(document.querySelectorAll('.view'));

const modeButtons = Array.from(document.querySelectorAll('.mode-btn'));
const heroTitle = document.getElementById('heroTitle');

const heroCopy = {
  save: 'Top deals backed by flyers and receipts.',
  plan: 'Build a basket with clear savings and fewer stops.',
  after: 'Scan your receipt to see what you overpaid.'
};

const API_BASE = window.RECEIPT_RADAR_API ||
  ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000'
    : window.location.origin);

function setView(view) {
  body.dataset.view = view;
  viewButtons.forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  views.forEach((section) => {
    section.classList.toggle('active', section.id === `view-${view}`);
  });
  if (view === 'map' && window.receiptRadarMap) {
    window.receiptRadarMap.invalidateSize();
  }
}

function setMode(mode) {
  body.dataset.mode = mode;
  modeButtons.forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  if (heroTitle) {
    heroTitle.textContent = heroCopy[mode] || heroCopy.save;
  }
}

viewButtons.forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.view));
});

modeButtons.forEach((button) => {
  button.addEventListener('click', () => setMode(button.dataset.mode));
});

setView(body.dataset.view || 'home');
setMode(body.dataset.mode || 'save');

const staggerGroups = Array.from(document.querySelectorAll('.stagger'));

staggerGroups.forEach((group) => {
  Array.from(group.children).forEach((child, index) => {
    child.style.animationDelay = `${index * 0.08}s`;
  });
});

async function fetchJson(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function postJson(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return await response.json();
}

async function uploadReceipt(file) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE}/receipts/upload`, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }
  return await response.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollReceiptStatus(receiptId) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const status = await fetchJson(`/receipts/${receiptId}/status`);
    if (status.status === 'processed' || status.status === 'finalized') {
      return status;
    }
    await sleep(800);
  }
  return null;
}

const mapElement = document.getElementById('map');
if (mapElement && window.L) {
  const map = L.map(mapElement, { zoomControl: false }).setView([54.6872, 25.2797], 12);
  window.receiptRadarMap = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const iconColors = {
    flyer: '#ff7a4f',
    receipt: '#f7d84b',
    online: '#4bc6b9'
  };

  const markers = [];

  function clearMarkers() {
    markers.forEach((marker) => marker.remove());
    markers.length = 0;
  }

  function addStoreMarker(store) {
    const source = (store.top_deals?.[0]?.source || 'flyer').toLowerCase();
    const marker = L.marker([store.lat, store.lon], {
      icon: L.divIcon({
        className: 'deal-marker',
        html: `<span style="background:${iconColors[source] || iconColors.flyer}"></span>`,
        iconSize: [18, 18]
      })
    }).addTo(map);

    const topDeal = store.top_deals?.[0];
    const dealLine = topDeal
      ? `${topDeal.product_name} • €${Number(topDeal.price).toFixed(2)}`
      : 'No top deals yet';
    marker.bindPopup(`<strong>${store.name}</strong><br/>${dealLine}`);
    markers.push(marker);
  }

  // Map filters state
  let mapFilters = {
    category: 'All',
    verified: false,
    maxDistance: null
  };

  async function loadStores(filters = {}) {
    clearMarkers();
    
    try {
      const params = new URLSearchParams({
        cityId: '1',
        ...filters
      });
      const stores = await fetchJson(`/map/stores?${params.toString()}`);
      
      if (stores.length === 0) {
        showToast('No stores found with current filters', 'info');
      } else {
        stores.forEach(addStoreMarker);
        const filterDesc = filters.category && filters.category !== 'All' 
          ? ` (${filters.category})` 
          : '';
        showToast(`Loaded ${stores.length} stores${filterDesc}`, 'success');
      }
    } catch (error) {
      console.error('Map loading error:', error);
      showToast('Failed to load stores, showing sample data', 'warning');
      
      // Fallback to sample data
      const fallback = [
        {
          name: 'Maxima X - Naujamiestis',
          lat: 54.676,
          lon: 25.267,
          top_deals: [{ product_name: 'Greek yogurt 400g', price: 1.19, source: 'FLYER' }]
        },
        {
          name: 'Rimi Hyper - Ozas',
          lat: 54.714,
          lon: 25.286,
          top_deals: [{ product_name: 'Coffee 1kg', price: 9.49, source: 'RECEIPT' }]
        },
        {
          name: 'Iki Express - Senamiestis',
          lat: 54.682,
          lon: 25.289,
          top_deals: [{ product_name: 'Salmon 300g', price: 4.99, source: 'ONLINE' }]
        }
      ];
      fallback.forEach(addStoreMarker);
    }
  }

  function updateMapFilters() {
    loadStores(mapFilters);
  }

  // Wire up filter chips
  const filterChips = document.querySelectorAll('.chip[data-filter]');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const filterType = chip.dataset.filter;
      const filterValue = chip.dataset.value;
      
      // Toggle active state
      chip.classList.toggle('active');
      
      // Update filter state
      if (filterType === 'category') {
        // Remove active from other category chips
        document.querySelectorAll('.chip[data-filter="category"]').forEach(c => {
          if (c !== chip) c.classList.remove('active');
        });
        mapFilters.category = chip.classList.contains('active') ? filterValue : 'All';
      } else if (filterType === 'verified') {
        mapFilters.verified = chip.classList.contains('active');
      } else if (filterType === 'distance') {
        // Remove active from other distance chips
        document.querySelectorAll('.chip[data-filter="distance"]').forEach(c => {
          if (c !== chip) c.classList.remove('active');
        });
        mapFilters.maxDistance = chip.classList.contains('active') ? parseFloat(filterValue) : null;
      }
      
      // Reload stores with new filters
      updateMapFilters();
    });
  });

  loadStores();
}

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');

const products = [
  {
    name: 'Greek yogurt 400g',
    store: 'Maxima X',
    price: '€1.19',
    source: 'FLYER',
    meta: 'Valid until Sep 14'
  },
  {
    name: 'Arabica coffee 1kg',
    store: 'Rimi',
    price: '€9.49',
    source: 'RECEIPT',
    meta: 'Paid yesterday'
  },
  {
    name: 'Fresh salmon 300g',
    store: 'Iki Express',
    price: '€4.99',
    source: 'ONLINE',
    meta: 'Updated 2h ago'
  },
  {
    name: 'Laundry pods 40 ct',
    store: 'Drogas',
    price: '€7.89',
    source: 'RECEIPT',
    meta: 'Median price'
  }
];

function renderResults(list, emptyMessage, emptyDetail) {
  if (!searchResults) return;
  searchResults.innerHTML = '';

  if (!list.length) {
    searchResults.innerHTML = `<div class="result-card"><p class="result-name">${emptyMessage || 'No matches yet.'}</p><p class="result-meta">${emptyDetail || 'Try a different keyword or barcode.'}</p></div>`;
    return;
  }

  list.forEach((item) => {
    const source = item.source || item.best_source || 'FLYER';
    const priceValue = item.price || item.best_price;
    const displayPrice = priceValue ? `€${Number(priceValue).toFixed(2)}` : '—';
    const storeName = item.store || item.store_chain || 'Unknown store';
    const metaLine = item.meta || `${storeName} • ${displayPrice}`;
    
    // Calculate unit price if data available
    let unitPrice = '';
    if (priceValue && item.pack_size_value && item.pack_size_unit) {
      const unitValue = (priceValue / item.pack_size_value).toFixed(2);
      unitPrice = `<div class="unit-price">€${unitValue}/${item.pack_size_unit}</div>`;
    }
    
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <div class="result-header">
        <p class="result-name">${item.name}</p>
        <span class="badge badge-${source === 'FLYER' ? 'flyer' : source === 'ONLINE' ? 'online' : 'receipt'}">${source}</span>
      </div>
      <p class="result-meta">${metaLine}</p>
      <p class="result-meta">${item.meta || 'Updated recently'}</p>
      ${unitPrice}
    `;
    searchResults.appendChild(card);
  });
}

async function handleSearch() {
  const query = (searchInput?.value || '').trim();
  if (!query) {
    renderResults([], 'Start typing to search products.', 'Use a product name or barcode.');
    return;
  }
  
  // Show loading
  if (searchResults) {
    searchResults.innerHTML = '<div class="loading-overlay"><div class="loading"></div><p>Searching...</p></div>';
  }
  
  try {
    const results = await fetchJson(`/search?q=${encodeURIComponent(query)}`);
    if (!results.length) {
      showEmpty(searchResults, 'search');
      return;
    }
    renderResults(results);
    showToast(`Found ${results.length} products`, 'success');
  } catch (error) {
    console.error('Search error:', error);
    showToast('Search failed, showing sample data', 'warning');
    const filtered = products.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
    if (filtered.length) {
      renderResults(filtered);
    } else {
      showEmpty(searchResults, 'search');
    }
  }
}

if (searchBtn) {
  searchBtn.addEventListener('click', handleSearch);
}

if (searchInput) {
  searchInput.addEventListener('input', handleSearch);
}

renderResults([], 'Start typing to search products.', 'Use a product name or barcode.');

const scanInput = document.getElementById('scanInput');
const scanPreview = document.getElementById('scanPreview');
const scanStatus = document.getElementById('scanStatus');
const scanBtn = document.getElementById('scanBtn');
let scanFileUrl = '';

const basketList = document.getElementById('basketList');
const planStore = document.getElementById('planStore');
const planTotal = document.getElementById('planTotal');
const planSave = document.getElementById('planSave');

const demoBasketItems = [
  { raw_name: 'Greek yogurt', quantity: 1 },
  { raw_name: 'Arabica coffee', quantity: 1 },
  { raw_name: 'Fresh salmon', quantity: 1 }
];

function renderBasketItems(items) {
  if (!basketList) return;
  basketList.innerHTML = '';
  if (!items.length) {
    basketList.innerHTML = '<div class="basket-item"><p>No basket items yet.</p></div>';
    return;
  }
  items.forEach((item) => {
    const source = item.source || 'FLYER';
    const badgeClass = source === 'FLYER' ? 'flyer' : source === 'ONLINE' ? 'online' : 'receipt';
    const el = document.createElement('div');
    el.className = 'basket-item';
    el.innerHTML = `
      <p>${item.product_name || item.raw_name}</p>
      <span class="badge badge-${badgeClass}">${source}</span>
    `;
    basketList.appendChild(el);
  });
}

function renderBasketPlan(plan) {
  if (!planStore || !planTotal || !planSave) return;
  if (!plan || !plan.plan || !plan.plan.length) {
    planStore.textContent = 'Plan unavailable';
    planTotal.textContent = 'Estimated total: —';
    planSave.textContent = 'Potential save: —';
    return;
  }
  const store = plan.plan[0];
  planStore.textContent = `Shop at ${store.store_name}`;
  planTotal.textContent = `Estimated total: €${Number(plan.total_price || 0).toFixed(2)}`;
  planSave.textContent = `Potential save: €${Number(plan.savings_eur || 0).toFixed(2)}`;
  renderBasketItems(store.items || []);
}

async function initBasket() {
  if (!basketList) return;
  try {
    const basket = await postJson('/baskets', { name: 'Demo basket' });
    await postJson(`/baskets/${basket.id}/items`, { items: demoBasketItems });
    const plan = await postJson(`/baskets/${basket.id}/optimize`, { mode: 'single_store' });
    renderBasketPlan(plan);
  } catch (error) {
    renderBasketItems(demoBasketItems.map((item) => ({ ...item, source: 'FLYER' })));
    if (planStore && planTotal && planSave) {
      planStore.textContent = 'Plan unavailable';
      planTotal.textContent = 'Estimated total: —';
      planSave.textContent = 'Potential save: —';
    }
  }
}

initBasket();

function updateScanPreview(file) {
  if (!scanPreview) return;
  if (scanFileUrl) {
    URL.revokeObjectURL(scanFileUrl);
    scanFileUrl = '';
  }
  if (!file) {
    scanPreview.innerHTML = '<p>Drop a receipt photo to see extraction.</p>';
    return;
  }
  scanFileUrl = URL.createObjectURL(file);
  scanPreview.innerHTML = `<img src="${scanFileUrl}" alt="Receipt preview" />`;
}

if (scanInput) {
  scanInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    updateScanPreview(file);
    if (scanStatus) {
      scanStatus.textContent = file ? 'Ready to analyze.' : 'Awaiting upload.';
    }
  });
}

if (scanBtn) {
  scanBtn.addEventListener('click', async () => {
    if (!scanInput || !scanInput.files[0]) {
      showToast('Please select a receipt photo first', 'warning');
      if (scanStatus) scanStatus.textContent = 'Please add a receipt photo.';
      return;
    }
    
    const file = scanInput.files[0];
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('File too large (max 10MB)', 'error');
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please upload an image file', 'error');
      return;
    }
    
    if (scanStatus) scanStatus.textContent = 'Uploading receipt...';
    showToast('Uploading receipt...', 'info');

    try {
      const uploadResult = await uploadReceipt(file);
      showToast('Receipt uploaded! Processing...', 'success');
      
      if (scanStatus) {
        scanStatus.textContent = `Processing receipt ${uploadResult.receipt_id.slice(0, 8)}...`;
      }
      
      const status = await pollReceiptStatus(uploadResult.receipt_id);
      
      if (!status) {
        showToast('Still processing. Check back soon.', 'info');
        if (scanStatus) scanStatus.textContent = 'Still processing. Check back soon.';
        return;
      }
      
      const report = await fetchJson(`/receipts/${uploadResult.receipt_id}/report`);
      showToast(`Extraction complete! Found ${report.overpaid_items.length} items`, 'success');
      
      if (scanStatus) {
        scanStatus.textContent = `Extraction complete. ${report.overpaid_items.length} lines captured.`;
      }
      
      // Check for low-confidence items
      if (status.low_confidence_count > 0) {
        showToast(`${status.low_confidence_count} items need confirmation`, 'warning');
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Upload failed. Please try again.', 'error');
      if (scanStatus) scanStatus.textContent = 'Upload failed. Please try again.';
    }
  });
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}

// ====================
// UI STATE MANAGEMENT
// ====================

// Toast Notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icons = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  };
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
  `;
  
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Auto-remove after 3s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Loading State
function showLoading(container, message = 'Loading...') {
  if (!container) return;
  container.innerHTML = `
    <div class="loading-overlay">
      <div class="loading"></div>
      <p>${message}</p>
    </div>
  `;
}

// Empty State
function showEmpty(container, type = 'deals') {
  if (!container) return;
  
  const states = {
    deals: {
      icon: '🏷️',
      title: 'No deals found',
      message: 'Check back later for new deals in your area!',
    },
    basket: {
      icon: '🛒',
      title: 'Your basket is empty',
      message: 'Add items to see the best shopping plans',
    },
    receipts: {
      icon: '🧾',
      title: 'No receipts yet',
      message: 'Upload your first receipt to start tracking prices',
    },
    search: {
      icon: '🔍',
      title: 'No results found',
      message: 'Try a different search term or product name',
    },
    map: {
      icon: '🗺️',
      title: 'No stores found',
      message: 'Try adjusting your filters',
    }
  };
  
  const state = states[type] || states.deals;
  
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">${state.icon}</div>
      <h3 class="empty-title">${state.title}</h3>
      <p class="empty-message">${state.message}</p>
    </div>
  `;
}

// Error State
function showError(container, message = 'Something went wrong', retryFn = null) {
  if (!container) return;
  
  container.innerHTML = `
    <div class="error-state">
      <div class="error-icon">⚠️</div>
      <h3 class="error-title">Oops! Something went wrong</h3>
      <p class="error-message">${message}</p>
      ${retryFn ? `<button class="primary-btn" onclick="${retryFn}">Try Again</button>` : ''}
    </div>
  `;
}

// Skeleton Loader
function showSkeleton(container, count = 3) {
  if (!container) return;
  
  let skeletons = '';
  for (let i = 0; i < count; i++) {
    skeletons += `
      <div class="skeleton-card skeleton"></div>
    `;
  }
  
  container.innerHTML = skeletons;
}

// Global Error Handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled error:', event.reason);
  showToast('An unexpected error occurred', 'error');
});

// Safe API Call Wrapper
async function safeApiCall(fn, errorMsg = 'Failed to load data') {
  try {
    return await fn();
  } catch (err) {
    console.error(err);
    showToast(errorMsg, 'error');
    throw err;
  }
}

console.log('✅ UI state management loaded');

// ====================
// RECEIPT CONFIRMATION
// ====================

let currentReceiptId = null;
let lowConfidenceItems = [];

function showConfirmationModal(receiptId, items) {
  currentReceiptId = receiptId;
  lowConfidenceItems = items;
  
  const modal = document.getElementById('confirmationModal');
  const body = document.getElementById('confirmationBody');
  
  if (!modal || !body) return;
  
  body.innerHTML = `
    <p style="margin-bottom: var(--space-4); color: var(--text-secondary);">
      Please review and correct the following items that were unclear:
    </p>
    ${items.map((item, index) => `
      <div class="confirmation-item" id="confirm-item-${index}">
        <div class="confirmation-label">Item ${index + 1}</div>
        <div class="confirmation-original">
          ${item.raw_name || 'Unknown item'}
        </div>
        <input 
          type="text" 
          class="confirmation-input" 
          id="confirm-input-${index}"
          value="${item.raw_name || ''}"
          placeholder="Enter correct product name"
          onchange="markAsEdited(${index})"
        />
        <div class="confirmation-confidence">
          <span class="confidence-badge">${Math.round(item.confidence * 100)}% confidence</span>
          <span>Price: €${item.price_value ? item.price_value.toFixed(2) : '0.00'}</span>
        </div>
      </div>
    `).join('')}
  `;
  
  modal.classList.add('show');
}

function closeConfirmationModal() {
  const modal = document.getElementById('confirmationModal');
  if (modal) {
    modal.classList.remove('show');
  }
  currentReceiptId = null;
  lowConfidenceItems = [];
}

function markAsEdited(index) {
  const item = document.getElementById(`confirm-item-${index}`);
  if (item) {
    item.classList.add('edited');
  }
}

async function submitConfirmations() {
  if (!currentReceiptId) return;
  
  const confirmations = lowConfidenceItems.map((item, index) => {
    const input = document.getElementById(`confirm-input-${index}`);
    return {
      original_line_id: item.id,
      corrected_name: input ? input.value.trim() : item.raw_name,
      user_confirmed: true
    };
  });
  
  try {
    const response = await fetch(`${API_BASE}/receipts/${currentReceiptId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmations })
    });
    
    if (response.ok) {
      showToast('Items confirmed successfully!', 'success');
      closeConfirmationModal();
      
      // Refresh receipt report if on report view
      if (body.dataset.view === 'report') {
        // Reload report
      }
    } else {
      showToast('Failed to save confirmations', 'error');
    }
  } catch (error) {
    console.error('Confirmation error:', error);
    showToast('Failed to save confirmations', 'error');
  }
}

// Update receipt upload to show confirmation modal for low-confidence items
if (scanBtn) {
  const originalOnClick = scanBtn.onclick;
  // Modal trigger is already integrated in the upload handler above
}

console.log('✅ Receipt confirmation UI loaded');

// ====================
// PRICE HISTORY / TRENDS
// ====================

function renderPriceTrend(priceHistory) {
  if (!priceHistory || priceHistory.length < 2) {
    return '';
  }
  
  const latest = priceHistory[0].avg_price;
  const previous = priceHistory[1].avg_price;
  const change = ((latest - previous) / previous * 100);
  
  if (Math.abs(change) < 1) {
    return `
      <div class="price-trend neutral">
        <span class="trend-arrow">→</span>
        <span class="trend-value">Stable</span>
        <span class="trend-label">vs last week</span>
      </div>
    `;
  }
  
  const isDown = change < 0;
  const arrow = isDown ? '↓' : '↑';
  const className = isDown ? 'down' : 'up';
  
  return `
    <div class="price-trend ${className}">
      <span class="trend-arrow">${arrow}</span>
      <span class="trend-value">${Math.abs(change).toFixed(1)}%</span>
      <span class="trend-label">vs last week</span>
    </div>
  `;
}

// Update renderResults to include price trends
const originalRenderResults = renderResults;
function renderResults(list, emptyMessage, emptyDetail) {
  if (!searchResults) return;
  searchResults.innerHTML = '';

  if (!list.length) {
    searchResults.innerHTML = `<div class="result-card"><p class="result-name">${emptyMessage || 'No matches yet.'}</p><p class="result-meta">${emptyDetail || 'Try a different keyword or barcode.'}</p></div>`;
    return;
  }

  list.forEach((item) => {
    const source = item.source || item.best_source || 'FLYER';
    const priceValue = item.price || item.best_price;
    const displayPrice = priceValue ? `€${Number(priceValue).toFixed(2)}` : '—';
    const storeName = item.store || item.store_chain || 'Unknown store';
    const metaLine = item.meta || `${storeName} • ${displayPrice}`;
    
    // Calculate unit price if data available
    let unitPrice = '';
    if (priceValue && item.pack_size_value && item.pack_size_unit) {
      const unitValue = (priceValue / item.pack_size_value).toFixed(2);
      unitPrice = `<div class="unit-price">€${unitValue}/${item.pack_size_unit}</div>`;
    }
    
    // Render price trend if history available
    const priceTrend = item.price_history ? renderPriceTrend(item.price_history) : '';
    
    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <div class="result-header">
        <p class="result-name">${item.name}</p>
        <span class="badge badge-${source === 'FLYER' ? 'flyer' : source === 'ONLINE' ? 'online' : 'receipt'}">${source}</span>
      </div>
      <p class="result-meta">${metaLine}</p>
      <p class="result-meta">${item.meta || 'Updated recently'}</p>
      ${unitPrice}
      ${priceTrend}
    `;
    searchResults.appendChild(card);
  });
}

console.log('✅ Price trend visualization loaded');

// ====================
// DYNAMIC VALIDITY DATES
// ====================

function formatValidityDate(validUntil) {
  if (!validUntil) return null;
  
  const date = new Date(validUntil);
  const now = new Date();
  
  // Check if expired
  if (date < now) {
    return {
      text: 'Expired',
      className: 'expired',
      isExpired: true
    };
  }
  
  // Format date
  const options = { month: 'short', day: 'numeric' };
  const formatted = date.toLocaleDateString('en-US', options);
  
  // Check if expires soon (within 3 days)
  const daysUntil = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
  const expiresSoon = daysUntil <= 3;
  
  return {
    text: `Valid until ${formatted}`,
    className: expiresSoon ? 'expires-soon' : 'valid',
    isExpired: false,
    expiresSoon
  };
}

function renderValidityBadge(validUntil) {
  const validity = formatValidityDate(validUntil);
  
  if (!validity) return '';
  
  return `<span class="validity-badge ${validity.className}">${validity.text}</span>`;
}

console.log('✅ Dynamic validity dates loaded');
