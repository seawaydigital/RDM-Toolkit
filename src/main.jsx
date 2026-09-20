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

// GitHub Pages cannot send the CSP header, and frame-ancestors is ignored in a
// <meta> CSP, so the live site can be framed. When framed, the app is never
// rendered — only a notice with a link out. The top-level navigation below is
// best-effort: Chromium refuses it from a cross-origin frame without a user
// gesture (verified 2026-09-19), so the notice is the real defence there.
// Hosts that send frame-ancestors make all of this a no-op.
function isFramed() {
  try {
    return window.top !== window.self;
  } catch {
    return true; // cross-origin parent throws on access — that is a frame
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));

if (isFramed()) {
  try {
    window.top.location.replace(window.location.href);
  } catch {
    // sandboxed or cross-origin parent — fall through and render the notice
  }
  root.render(
    <p className="framed-notice">
      RDM Toolkit cannot be displayed inside another website. Open{' '}
      <a href={window.location.href} target="_top">rdmtoolkit.ca</a> directly.
    </p>,
  );
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
