import '@fontsource-variable/geist';
import './styles/tokens.css';
import './styles/base.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { config } from 'zod/v4/core';
import { App } from './app/App.js';

// Zod compiles validators with `new Function` unless told not to, and the strict CSP forbids
// that. This must run before any schema module loads, so it lives in the entry point.
config({ jitless: true });

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
