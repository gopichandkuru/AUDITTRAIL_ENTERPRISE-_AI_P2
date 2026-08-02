import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

// Apply persisted theme before first render
const persisted = localStorage.getItem('audittrail-ui');
if (persisted) {
  try {
    const { state } = JSON.parse(persisted);
    if (state?.theme) {
      document.documentElement.setAttribute('data-theme', state.theme);
    }
  } catch (_) {}
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
