import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// UX: ao focar um campo numérico, seleciona o valor atual para digitar por cima
document.addEventListener('focusin', (e) => {
  const t = e.target as HTMLElement | null;
  if (t instanceof HTMLInputElement && (t.type === 'number' || t.inputMode === 'numeric')) {
    try { t.select(); } catch { /* ignore */ }
  }
});
// PWA: registra o service worker só em produção (no celular = offline + instalável)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* offline opcional */ });
  });
}
