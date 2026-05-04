import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

if (import.meta.env.DEV) {
  import('@axe-core/react').then(({ default: axe }) => {
    import('react-dom').then((ReactDOMLegacy) => {
      axe(React, ReactDOMLegacy, 1000);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
