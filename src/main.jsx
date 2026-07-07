import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

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
