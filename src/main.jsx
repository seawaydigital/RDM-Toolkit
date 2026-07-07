import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

// Trusted Types default policy. The production CSP enforces
// require-trusted-types-for 'script', which (in Chromium) also gates the
// Worker() constructor. pdfjs creates its worker from a string URL, so the
// default policy vouches for script URLs — but only same-origin ones.
// HTML sinks get no default policy: only DOMPurify's TrustedHTML is accepted.
if (window.trustedTypes?.createPolicy) {
  try {
    window.trustedTypes.createPolicy('default', {
      createScriptURL(url) {
        if (new URL(url, window.location.origin).origin === window.location.origin) {
          return url;
        }
        throw new TypeError(`Blocked cross-origin script URL: ${url}`);
      },
    });
  } catch {
    // Policy already exists (e.g. dev double-init under StrictMode/HMR).
  }
}

if (import.meta.env.DEV) {
  Promise.all([
    import('@axe-core/react'),
    import('react'),
    import('react-dom'),
  ]).then(([{ default: axe }, ReactModule, ReactDOMModule]) => {
    axe(ReactModule, ReactDOMModule, 1000);
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
