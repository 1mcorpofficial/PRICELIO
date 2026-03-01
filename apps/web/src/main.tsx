import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { onCLS, onINP, onLCP } from 'web-vitals';
import { AppRouter } from './AppRouter';
import { trackUiEvent } from './lib/analytics';
import './styles/tailwind.css';
import './styles/tokens.css';
import './styles/base.css';

registerSW({ immediate: true });

onLCP((metric) => {
  void trackUiEvent('lp_viewed', { metric: 'LCP', value: metric.value });
});
onCLS((metric) => {
  void trackUiEvent('lp_viewed', { metric: 'CLS', value: metric.value });
});
onINP((metric) => {
  void trackUiEvent('lp_viewed', { metric: 'INP', value: metric.value });
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
