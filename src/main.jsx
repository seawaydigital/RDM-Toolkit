import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

if (import.meta.env.DEV) {
  // Dev-only: log accessibility violations to the browser console.
  // Dynamic imports keep @axe-core/react and the legacy react-dom out of the
  // production bundle. axe(...) requires the legacy `react-dom`, not `/client`.
  Promise.all([import('@axe-core/react'), import('react-dom')])
    .then(([{ default: axe }, ReactDOMLegacy]) => axe(React, ReactDOMLegacy, 1000))
    .catch((err) => console.warn('[axe] dev-mode init failed:', err));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
